-- =============================================================================
-- Row Level Security hardening for Supabase (run ONCE in the SQL editor; idempotent)
--
-- WHY: the app talks to Postgres through a direct DATABASE_URL connection
-- (Drizzle), which uses a privileged role and BYPASSES RLS. Authorization is
-- enforced in the Next.js server code. But Supabase also exposes every table in
-- schema public through the PostgREST API to anyone holding the public anon key
-- (it ships in the browser bundle). Without RLS/grants, that key could read or
-- write tables directly. This script closes that door: RLS enabled + forced on
-- every table, all anon/authenticated privileges revoked, and only the single
-- thing the browser really does (upsert own row in public.profiles, see
-- src/app/profile/page.tsx) is re-granted with own-row policies.
--
-- HOW TO TEST (after running):
--   curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payments?select=*" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
--     -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
--   -> expect 401/403 (permission denied) or an empty array, never rows.
--   Then sign in on the site and save the profile page: it must still work.
--
-- NOTE: new tables created later (e.g. by drizzle-kit push) need RLS enabled
-- again; re-run the DO block below after schema changes.
-- =============================================================================

-- 1) Enable + force RLS on every table in public
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2) Remove all API-role privileges, now and for future objects
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 3) profiles: signed-in users may read/insert/update only their own row
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

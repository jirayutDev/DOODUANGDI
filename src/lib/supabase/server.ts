import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ใช้ใน Server Component / Route Handler เท่านั้น
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // เรียกจาก Server Component (ไม่มี response ให้ set cookie) — ปล่อยให้ middleware refresh session แทน
          }
        },
      },
    }
  );
}

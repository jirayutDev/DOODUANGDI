import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ application: null });

  const db = getDb();
  const [application] = await db.select().from(morDus).where(eq(morDus.userId, user.id)).limit(1);

  return NextResponse.json({ application: application ?? null });
}

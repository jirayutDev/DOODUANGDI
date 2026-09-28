import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json()) as { userId?: string; action?: "approve" | "reject" };
  if (!body.userId || !body.action) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const db = getDb();
  await db
    .update(morDus)
    .set({ status: body.action === "approve" ? "approved" : "rejected", updatedAt: new Date() })
    .where(eq(morDus.userId, body.userId));

  return NextResponse.json({ ok: true });
}

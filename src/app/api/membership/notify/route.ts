import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = (await req.json()) as { paymentId?: string };
  if (!body.paymentId) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .update(payments)
    .set({ status: "awaiting_confirmation", notifiedAt: new Date() })
    .where(
      and(
        eq(payments.id, body.paymentId),
        eq(payments.userId, user.id),
        eq(payments.status, "pending")
      )
    )
    .returning();

  if (result.length === 0) {
    return NextResponse.json(
      { error: "ไม่พบรายการนี้ หรือแจ้งไปแล้ว" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

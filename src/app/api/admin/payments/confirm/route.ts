import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/db";
import { payments, memberships } from "@/db/schema";
import { eq } from "drizzle-orm";

const MEMBERSHIP_DURATION_DAYS = 30;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json()) as { paymentId?: string };
  if (!body.paymentId) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, body.paymentId))
    .limit(1);

  if (!payment) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MEMBERSHIP_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(payments)
    .set({ status: "confirmed", confirmedAt: now })
    .where(eq(payments.id, payment.id));

  await db
    .insert(memberships)
    .values({
      userId: payment.userId,
      plan: payment.purpose,
      expiresAt,
      lastPaymentId: payment.id,
    })
    .onConflictDoUpdate({
      target: memberships.userId,
      set: { plan: payment.purpose, expiresAt, lastPaymentId: payment.id, updatedAt: now },
    });

  return NextResponse.json({ ok: true });
}

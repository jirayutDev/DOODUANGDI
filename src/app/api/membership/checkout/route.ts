import { and, count, eq, gte } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { getMembershipPlan } from "@/lib/membership-plans";
import { createPaymentQrDataUrl } from "@/lib/payment-qr";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }


  if (!(await rateLimit(`checkout:${user.id}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "ทำรายการถี่เกินไป ลองใหม่ภายหลังนะ" }, { status: 429 });
  }
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(payments)
    .where(
      and(eq(payments.userId, user.id), eq(payments.status, "pending"), gte(payments.createdAt, new Date(Date.now() - 60 * 60 * 1000)))
    );
  if (n >= 3) {
    return NextResponse.json({ error: "มีรายการรอชำระหลายรายการแล้ว ชำระหรือรอสักครู่ก่อนนะ" }, { status: 429 });
  }

  let body: { plan?: string };
  try {
    body = (await req.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const plan = getMembershipPlan(body.plan ?? "");
  if (!plan) {
    return NextResponse.json({ error: "ไม่พบแพ็กเกจนี้" }, { status: 400 });
  }

  const promptpayId = process.env.PROMPTPAY_ID;
  if (!promptpayId) {
    return NextResponse.json(
      { error: "ระบบชำระเงินยังไม่พร้อมใช้งาน ติดต่อแอดมิน" },
      { status: 503 }
    );
  }

  const ref = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

  try {
    const db = getDb();
    const [payment] = await db
      .insert(payments)
      .values({
        userId: user.id,
        purpose: plan.key,
        amountBaht: plan.priceBaht,
        promptpayRef: ref,
      })
      .returning();

    const qrDataUrl = await createPaymentQrDataUrl(promptpayId, plan.priceBaht, ref);

    return NextResponse.json({
      paymentId: payment.id,
      ref,
      qrDataUrl,
      amount: plan.priceBaht,
      planName: plan.name,
    });
  } catch {
    return NextResponse.json(
      { error: "สร้างรายการชำระเงินไม่สำเร็จ ลองใหม่อีกครั้งนะ" },
      { status: 500 }
    );
  }
}

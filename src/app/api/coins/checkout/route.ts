import { and, count, eq, gte } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { getPricing } from "@/lib/pricing";
import { bonusFor } from "@/lib/coin-config";
import { createPromptPayQr, isPaysoConfigured, newPaysoRef } from "@/lib/payso";

// เติม coin ผ่าน Payso PromptPay QR: สร้างรายการ payment (purpose = coin_topup) แล้วขอ QR จาก Payso
// ลูกค้าสแกนจ่าย -> Payso ส่ง postback (/api/payments/payso/postback) หรือหน้าเว็บโพล /api/payments/status -> เติม coin
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน", code: "login_required" }, { status: 401 });
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

  let body: { packageId?: string };
  try {
    body = (await req.json()) as { packageId?: string };
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const pricing = await getPricing();
  const pack = pricing.packages.find((p) => p.id === body.packageId);
  if (!pack) return NextResponse.json({ error: "ไม่พบแพ็กเกจนี้" }, { status: 400 });
  // โบนัสโปรโมชันตัดสินที่นี่ฝั่งเซิร์ฟเวอร์เท่านั้น แล้วเก็บไว้กับรายการ แก้โปรทีหลังไม่กระทบ QR ที่สร้างไปแล้ว
  const { bonus, promo } = bonusFor(pack, pricing.promotions);

  if (!isPaysoConfigured()) {
    return NextResponse.json(
      { error: "ระบบชำระเงินยังไม่พร้อมใช้งาน ติดต่อแอดมิน" },
      { status: 503 }
    );
  }
  if (!user.email) {
    return NextResponse.json({ error: "บัญชีนี้ไม่มีอีเมล ชำระเงินไม่ได้" }, { status: 400 });
  }

  const db = getDb();
  let payment: typeof payments.$inferSelect | undefined;
  const ref = newPaysoRef();
  try {
    [payment] = await db
      .insert(payments)
      .values({
        userId: user.id,
        purpose: "coin_topup",
        amountBaht: pack.priceBaht,
        coins: pack.coins,
        bonusCoins: bonus > 0 ? bonus : null,
        promoId: bonus > 0 ? (promo?.id ?? null) : null,
        promptpayRef: ref,
      })
      .returning();
  } catch {
    return NextResponse.json({ error: "สร้างรายการชำระเงินไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  }

  const qr = await createPromptPayQr({
    referenceNo: ref,
    amountBaht: pack.priceBaht,
    customerEmail: user.email,
    detail: `Coin ${pack.coins}`,
  });
  if (!qr) {
    // ขอ QR ไม่สำเร็จ -> ปิดรายการทิ้ง ไม่ให้ค้าง pending นับโควตา
    await db.update(payments).set({ status: "rejected" }).where(eq(payments.id, payment.id));
    return NextResponse.json({ error: "สร้าง QR ไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 502 });
  }
  return NextResponse.json({
    paymentId: payment.id,
    ref,
    qrDataUrl: qr.qrDataUrl,
    amount: pack.priceBaht,
    coins: pack.coins,
    bonus: bonus > 0 ? bonus : 0,
    promoName: bonus > 0 ? (promo?.name ?? null) : null,
    expiresAt: qr.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
}

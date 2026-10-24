import { and, count, eq, gte } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { getCoinPackage } from "@/lib/coin-config";
import { createPaymentQrDataUrl } from "@/lib/payment-qr";

// เติม coin ผ่าน PromptPay: สร้างรายการ payment (purpose = coin_topup) แล้วใช้ flow เดียวกับสมาชิก
// (ผู้ใช้กดแจ้งชำระที่ /api/membership/notify -> แอดมินยืนยัน -> ระบบเติม coin ให้)
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

  const pack = getCoinPackage(body.packageId ?? "");
  if (!pack) return NextResponse.json({ error: "ไม่พบแพ็กเกจนี้" }, { status: 400 });

  const promptpayId = process.env.PROMPTPAY_ID;
  if (!promptpayId) {
    return NextResponse.json(
      { error: "ระบบชำระเงินยังไม่พร้อมใช้งาน ติดต่อแอดมิน" },
      { status: 503 }
    );
  }

  const ref = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  try {
    const [payment] = await getDb()
      .insert(payments)
      .values({
        userId: user.id,
        purpose: "coin_topup",
        amountBaht: pack.priceBaht,
        coins: pack.coins,
        promptpayRef: ref,
      })
      .returning();

    const qrDataUrl = await createPaymentQrDataUrl(promptpayId, pack.priceBaht, ref);
    return NextResponse.json({ paymentId: payment.id, ref, qrDataUrl, amount: pack.priceBaht, coins: pack.coins });
  } catch {
    return NextResponse.json({ error: "สร้างรายการชำระเงินไม่สำเร็จ" }, { status: 500 });
  }
}

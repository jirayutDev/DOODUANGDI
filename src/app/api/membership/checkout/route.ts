import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { getMembershipPlan } from "@/lib/membership-plans";
import { generatePromptPayPayload } from "@/lib/promptpay";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = (await req.json()) as { plan?: string };
  const plan = getMembershipPlan(body.plan ?? "");
  if (!plan) {
    return NextResponse.json({ error: "ไม่พบแพ็กเกจนี้" }, { status: 400 });
  }

  const promptpayId = process.env.PROMPTPAY_ID;
  if (!promptpayId) {
    return NextResponse.json(
      { error: "ระบบยังไม่ได้ตั้งค่าเลขพร้อมเพย์ (PROMPTPAY_ID) — ติดต่อแอดมิน" },
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

    const payload = generatePromptPayPayload(promptpayId, plan.priceBaht, ref);
    const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });

    return NextResponse.json({
      paymentId: payment.id,
      ref,
      qrDataUrl,
      amount: plan.priceBaht,
      planName: plan.name,
    });
  } catch {
    return NextResponse.json(
      { error: "สร้างรายการชำระเงินไม่สำเร็จ — เช็กว่าต่อ Supabase/DATABASE_URL แล้วหรือยัง" },
      { status: 500 }
    );
  }
}

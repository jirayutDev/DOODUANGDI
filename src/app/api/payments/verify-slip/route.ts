import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { isSlip2GoConfigured, verifySlipImage } from "@/lib/slip2go";
import { fulfillPayment } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const MAX_SLIP_BYTES = 3 * 1024 * 1024;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function hasImageMagic(b: Uint8Array): boolean {
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  return jpeg || png;
}

// ผู้ใช้อัปโหลดสลิป -> Slip2Go ตรวจ -> ผ่านแล้วเปิดสิทธิ์/เติม coin อัตโนมัติ
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน", code: "login_required" }, { status: 401 });
  }

  if (!isSlip2GoConfigured()) {
    return NextResponse.json(
      { error: "ระบบตรวจสลิปอัตโนมัติยังไม่เปิด กดแจ้งชำระเงินแล้วรอแอดมินตรวจสอบแทนนะ", fallback: true },
      { status: 503 }
    );
  }

  if (!(await rateLimit(`slip:${user.id}`, 8, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "ลองถี่เกินไป พักสักครู่แล้วลองใหม่นะ" }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "ใช้ไฟล์ JPG/PNG ขนาดไม่เกิน 3MB" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const paymentId = form.get("paymentId");
  const file = form.get("file");
  if (typeof paymentId !== "string" || !z.string().uuid().safeParse(paymentId).success || !(file instanceof File)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  if (file.size > MAX_SLIP_BYTES || file.size < 4) {
    return NextResponse.json({ error: "ใช้ไฟล์ JPG/PNG ขนาดไม่เกิน 3MB" }, { status: 400 });
  }
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!hasImageMagic(head)) {
    return NextResponse.json({ error: "ใช้ไฟล์ JPG/PNG ขนาดไม่เกิน 3MB" }, { status: 400 });
  }

  const db = getDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.userId, user.id),
        inArray(payments.status, ["pending", "awaiting_confirmation"])
      )
    )
    .limit(1);
  if (!payment) {
    return NextResponse.json({ error: "ไม่พบรายการนี้ หรือชำระไปแล้ว" }, { status: 404 });
  }

  const result = await verifySlipImage(file, { amountBaht: payment.amountBaht, notBefore: payment.createdAt });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 422 });

  // ผูกสลิป + เปิดสิทธิ์/เติม coin ใน transaction เดียว: unique index กันใช้สลิปใบเดียวจ่ายหลายรายการ
  // และถ้าขั้นใดล้ม ทุกอย่างย้อนกลับ สลิปไม่ถูกใช้ทิ้ง
  try {
    const outcome = await fulfillPayment(payment.id, result.transRef);
    if (outcome === "slip_used") {
      return NextResponse.json({ error: "สลิปนี้ถูกใช้ไปแล้ว" }, { status: 409 });
    }
    if (outcome === "rejected") {
      return NextResponse.json({ error: "รายการนี้ถูกปฏิเสธแล้ว" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "ยืนยันรายการไม่สำเร็จ ลองอัปโหลดสลิปเดิมอีกครั้งได้เลย" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

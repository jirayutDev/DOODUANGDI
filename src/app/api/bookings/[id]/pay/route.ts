import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { createPromptPayQr, isPaysoConfigured, newPaysoRef } from "@/lib/payso";
import { currentUser, fail, loadBooking } from "@/lib/booking-api";

// ลูกค้าจ่ายค่าปรึกษาของคิวที่หมอดูรับแล้ว: สร้าง PromptPay QR ผ่าน Payso (ยืนยันผ่าน /api/payments/status เหมือนการเติม coin)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const b = await loadBooking((await params).id);
  if (!b || b.customerId !== user.id) return fail("ไม่พบรายการนี้", 404);
  if (b.status !== "accepted") return fail("คิวนี้ยังไม่พร้อมชำระเงิน", 409);
  if (b.startsAt.getTime() < Date.now() + 10 * 60_000) return fail("ใกล้เวลานัดเกินไป ชำระเงินไม่ทัน ขอคิวใหม่นะ", 409);
  if (!isPaysoConfigured()) return fail("ระบบชำระเงินยังไม่พร้อมใช้งาน ติดต่อแอดมิน", 503);
  if (!user.email) return fail("บัญชีนี้ไม่มีอีเมล ชำระเงินไม่ได้", 400);
  if (!(await rateLimit(`bookpay:${user.id}`, 10, 60 * 60 * 1000))) return fail("ทำรายการถี่เกินไป ลองใหม่ภายหลัง", 429);

  // ถ้ามี QR ที่ยังไม่หมดอายุ (10 นาที) ของคิวนี้อยู่แล้ว ไม่สร้างซ้ำ กันจ่ายซ้อนสองรายการ
  const db = getDb();
  const [{ n: live }] = await db
    .select({ n: count() })
    .from(payments)
    .where(and(eq(payments.bookingId, b.id), eq(payments.status, "pending"), gte(payments.createdAt, new Date(Date.now() - 10 * 60_000))));
  if (live > 0) return fail("มี QR ที่ยังไม่หมดอายุของคิวนี้อยู่แล้ว ใช้ QR เดิมหรือรอ 10 นาทีแล้วขอใหม่", 409);

  const ref = newPaysoRef();
  const [payment] = await db
    .insert(payments)
    .values({ userId: user.id, purpose: "booking", amountBaht: b.priceBaht, bookingId: b.id, promptpayRef: ref })
    .returning({ id: payments.id });
  const qr = await createPromptPayQr({ referenceNo: ref, amountBaht: b.priceBaht, customerEmail: user.email, detail: "Consult booking" });
  if (!qr) {
    await db.update(payments).set({ status: "rejected" }).where(eq(payments.id, payment.id));
    return fail("สร้าง QR ไม่สำเร็จ ลองใหม่อีกครั้ง", 502);
  }
  return NextResponse.json({
    paymentId: payment.id,
    ref,
    qrDataUrl: qr.qrDataUrl,
    amount: b.priceBaht,
    expiresAt: qr.expiresAt ?? new Date(Date.now() + 10 * 60_000).toISOString(),
  });
}

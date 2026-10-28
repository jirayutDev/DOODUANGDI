import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, morDus, payments } from "@/db/schema";
import { grantCoins } from "@/lib/coins";
import { createMeetLink } from "@/lib/google-meet";

export type FulfillResult = "ok" | "already_confirmed" | "rejected" | "not_found" | "slip_used";

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
}

// ยืนยันการชำระเงิน: ใช้ร่วมกันทั้งแอดมินกดยืนยันเอง และระบบยืนยันอัตโนมัติจาก Payso
// ทุกขั้น (เปลี่ยนสถานะ เติม coin หรือเปลี่ยนสถานะการจอง) อยู่ใน transaction เดียว
// ถ้าขั้นใดล้มจะย้อนกลับทั้งหมด กดซ้ำไม่ทำให้เติม/เปลี่ยนสองรอบ
export async function fulfillPayment(paymentId: string, slipTransRef?: string): Promise<FulfillResult> {
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return "not_found";

  let result: FulfillResult;
  try {
    result = await db.transaction(async (tx): Promise<FulfillResult> => {
      const now = new Date();
      const claimed = await tx
        .update(payments)
        .set({ status: "confirmed", confirmedAt: now, ...(slipTransRef ? { slipTransRef } : {}) })
        .where(and(eq(payments.id, payment.id), inArray(payments.status, ["pending", "awaiting_confirmation"])))
        .returning({ id: payments.id });
      if (claimed.length === 0) {
        const [cur] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, payment.id)).limit(1);
        return cur?.status === "rejected" ? "rejected" : "already_confirmed";
      }

      if (payment.purpose === "coin_topup") {
        await grantCoins(payment.userId, payment.coins ?? 0, "topup", payment.id, tx);
      } else if (payment.purpose === "booking" && payment.bookingId) {
        // การจองต้องอยู่ในสถานะ "รอชำระเงิน" ถึงจะเปลี่ยนเป็น "ชำระแล้ว" (ยกเลิกไปแล้วจะไม่ถูกเปลี่ยนกลับ ให้แอดมินตรวจ/คืนเงินเอง)
        await tx
          .update(bookings)
          .set({ status: "paid", paidAt: now, updatedAt: now })
          .where(and(eq(bookings.id, payment.bookingId), eq(bookings.status, "accepted")));
      }
      // รายการสมาชิกเก่า (ai_plus/mu_club) ไม่เติมสิทธิ์อะไรแล้ว
      return "ok";
    });
  } catch (e) {
    // เลขสลิปซ้ำกับรายการอื่น (unique) -> transaction ย้อนกลับทั้งหมดแล้ว
    if (slipTransRef && isUniqueViolation(e)) return "slip_used";
    throw e;
  }

  if (result === "ok" && payment.purpose === "booking" && payment.bookingId) {
    await attachMeetLink(payment.bookingId);
  }
  return result;
}

// สร้างห้อง Google Meet ให้การจองที่ชำระแล้ว (ทำหลัง transaction เสร็จ ล้มเหลวไม่กระทบการชำระ หมอดูวางลิงก์เองได้)
export async function attachMeetLink(bookingId: string): Promise<void> {
  try {
    const db = getDb();
    const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!b || b.status !== "paid" || b.meetUrl) return;
    const [m] = await db.select({ name: morDus.displayName }).from(morDus).where(eq(morDus.userId, b.morDuId)).limit(1);
    const meet = await createMeetLink({
      title: `ปรึกษา${m?.name ?? "หมอดู"} · ดูดวงดิ`,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      requestId: b.id,
    });
    if (!meet) return;
    await db
      .update(bookings)
      .set({ meetUrl: meet.url, meetEventId: meet.eventId, updatedAt: new Date() })
      .where(and(eq(bookings.id, b.id), eq(bookings.status, "paid")));
  } catch (e) {
    console.error("[booking] attach meet failed", e instanceof Error ? e.message : e);
  }
}

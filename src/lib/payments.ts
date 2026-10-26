import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { grantCoins } from "@/lib/coins";

export type FulfillResult = "ok" | "already_confirmed" | "rejected" | "not_found" | "slip_used";

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
}

// ยืนยันการชำระเงิน: ใช้ร่วมกันทั้งแอดมินกดยืนยันเอง และระบบตรวจสลิปอัตโนมัติ
// ทุกขั้น (เปลี่ยนสถานะ ผูกสลิป เปิดสิทธิ์/เติม coin) อยู่ใน transaction เดียว
// ถ้าขั้นใดล้มจะย้อนกลับทั้งหมด สลิปจึงไม่ถูกใช้ทิ้งโดยที่ลูกค้าไม่ได้ของ และกดซ้ำไม่ทำให้เติมสองรอบ
export async function fulfillPayment(paymentId: string, slipTransRef?: string): Promise<FulfillResult> {
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return "not_found";

  try {
    return await db.transaction(async (tx): Promise<FulfillResult> => {
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

      // โมเดลปัจจุบันมีแค่เติม coin; รายการสมาชิกเก่า (ai_plus/mu_club) ที่ค้างอยู่ไม่เติมสิทธิ์อะไรแล้ว
      if (payment.purpose !== "coin_topup") return "ok";
      await grantCoins(payment.userId, payment.coins ?? 0, "topup", payment.id, tx);
      return "ok";
    });
  } catch (e) {
    // เลขสลิปซ้ำกับรายการอื่น (unique) -> transaction ย้อนกลับทั้งหมดแล้ว
    if (slipTransRef && isUniqueViolation(e)) return "slip_used";
    throw e;
  }
}

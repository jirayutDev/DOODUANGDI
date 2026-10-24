import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, payments } from "@/db/schema";
import { grantCoins } from "@/lib/coins";
import { MEMBERSHIP_BONUS_COINS } from "@/lib/coin-config";

export const MEMBERSHIP_DURATION_DAYS = 30;

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

      if (payment.purpose === "coin_topup") {
        await grantCoins(payment.userId, payment.coins ?? 0, "topup", payment.id, tx);
        return "ok";
      }

      const [existing] = await tx
        .select()
        .from(memberships)
        .where(eq(memberships.userId, payment.userId))
        .for("update")
        .limit(1);
      const active = !!existing && existing.expiresAt > now;
      const base = active ? existing.expiresAt : now;
      const expiresAt = new Date(base.getTime() + MEMBERSHIP_DURATION_DAYS * 24 * 60 * 60 * 1000);
      // ไม่ลดระดับแพ็กเกจที่ active อยู่ (mu_club สูงกว่า ai_plus)
      const plan = active && existing.plan === "mu_club" ? "mu_club" : payment.purpose;
      await tx
        .insert(memberships)
        .values({ userId: payment.userId, plan, expiresAt, lastPaymentId: payment.id })
        .onConflictDoUpdate({
          target: memberships.userId,
          set: { plan, expiresAt, lastPaymentId: payment.id, updatedAt: now },
        });

      const bonus = MEMBERSHIP_BONUS_COINS[payment.purpose] ?? 0;
      if (bonus > 0) await grantCoins(payment.userId, bonus, "bonus", payment.id, tx);
      return "ok";
    });
  } catch (e) {
    // เลขสลิปซ้ำกับรายการอื่น (unique) -> transaction ย้อนกลับทั้งหมดแล้ว
    if (slipTransRef && isUniqueViolation(e)) return "slip_used";
    throw e;
  }
}

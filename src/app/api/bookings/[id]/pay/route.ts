import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, coinTransactions, coinWallets } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { attachMeetLink } from "@/lib/booking-meet";
import { currentUserId, fail, loadBooking } from "@/lib/booking-api";

class NotPayable extends Error {}

// ลูกค้าจ่ายค่าปรึกษาของคิวที่หมอดูรับแล้วด้วย coin: หัก coin + เปลี่ยนสถานะเป็นชำระแล้วใน transaction เดียว
// (ถ้าขั้นใดล้ม ย้อนกลับทั้งหมด coin ไม่หาย) หลังสำเร็จสร้างห้อง Google Meet ให้อัตโนมัติ
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const b = await loadBooking((await params).id);
  if (!b || b.customerId !== userId) return fail("ไม่พบรายการนี้", 404);
  if (b.status !== "accepted") return fail("คิวนี้ยังไม่พร้อมชำระเงิน", 409);
  if (b.startsAt.getTime() < Date.now() + 10 * 60_000) return fail("ใกล้เวลานัดเกินไป ชำระไม่ทัน ขอคิวใหม่นะ", 409);
  if (!(await rateLimit(`bookpay:${userId}`, 10, 60 * 60 * 1000))) return fail("ทำรายการถี่เกินไป ลองใหม่ภายหลัง", 429);

  const price = b.priceCoins;
  let outcome: "ok" | "insufficient";
  try {
    outcome = await getDb().transaction(async (tx) => {
      const spent = await tx
        .update(coinWallets)
        .set({ balance: sql`${coinWallets.balance} - ${price}`, updatedAt: new Date() })
        .where(and(eq(coinWallets.userId, userId), gte(coinWallets.balance, price)))
        .returning({ userId: coinWallets.userId });
      if (spent.length === 0) return "insufficient";

      await tx.insert(coinTransactions).values({ userId, amount: -price, kind: "spend", ref: `booking:${b.id}` });

      const now = new Date();
      const paid = await tx
        .update(bookings)
        .set({ status: "paid", paidAt: now, updatedAt: now })
        .where(and(eq(bookings.id, b.id), eq(bookings.status, "accepted")))
        .returning({ id: bookings.id });
      // สถานะเปลี่ยนไปแล้ว (เช่น ถูกยกเลิก/จ่ายซ้ำพร้อมกัน): โยน error ให้ย้อนกลับ coin ที่เพิ่งหักด้วย
      if (paid.length === 0) throw new NotPayable();
      return "ok";
    });
  } catch (e) {
    if (e instanceof NotPayable) return fail("คิวนี้ชำระหรือเปลี่ยนสถานะไปแล้ว ลองรีเฟรชหน้านี้", 409);
    console.error("[booking] pay failed", e instanceof Error ? e.message : e);
    return fail("ชำระเงินไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
  }

  if (outcome === "insufficient") {
    return NextResponse.json({ error: `coin ไม่พอ (ต้องใช้ ${price} coin)`, code: "insufficient_coins", cost: price }, { status: 402 });
  }

  await attachMeetLink(b.id);
  const fresh = await loadBooking(b.id);
  return NextResponse.json({ ok: true, meetUrl: fresh?.meetUrl ?? null });
}

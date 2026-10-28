import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, morDuLedger } from "@/db/schema";
import { currentUserId, fail, loadBooking } from "@/lib/booking-api";

// หมอดูกด "เสร็จสิ้น" หลังถึงเวลานัด: รายได้ (ราคา − ค่าคอมมิชชัน) เข้ายอดของหมอดู ทำซ้ำไม่ได้ (ล็อกด้วยสถานะ + unique ต่อการจอง)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const b = await loadBooking((await params).id);
  if (!b || b.morDuId !== userId) return fail("ไม่พบรายการนี้", 404);
  if (b.status !== "paid") return fail("คิวนี้ไม่ได้อยู่ในสถานะชำระแล้ว", 409);
  if (b.startsAt.getTime() > Date.now()) return fail("ยังไม่ถึงเวลานัด", 409);

  const earn = b.priceBaht - b.commissionBaht;
  const ok = await getDb().transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx
      .update(bookings)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(and(eq(bookings.id, b.id), eq(bookings.status, "paid")))
      .returning({ id: bookings.id });
    if (claimed.length === 0) return false;
    await tx
      .insert(morDuLedger)
      .values({ morDuId: b.morDuId, bookingId: b.id, amountBaht: earn, kind: "earning", note: `คิว ${b.startsAt.toISOString()}` })
      .onConflictDoNothing();
    return true;
  });
  if (!ok) return fail("คิวนี้ถูกปิดไปแล้ว", 409);
  return NextResponse.json({ ok: true, earned: earn });
}

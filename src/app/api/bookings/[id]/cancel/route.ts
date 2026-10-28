import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { currentUserId, fail, loadBooking } from "@/lib/booking-api";

// ยกเลิกคิวที่ยังไม่ชำระเงิน (ลูกค้าหรือหมอดู) — คิวที่จ่ายแล้วยกเลิก/คืนเงินผ่านแอดมิน
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const b = await loadBooking((await params).id);
  if (!b || (b.customerId !== userId && b.morDuId !== userId)) return fail("ไม่พบรายการนี้", 404);
  if (b.status === "paid") return fail("คิวนี้ชำระเงินแล้ว หากต้องการยกเลิกหรือขอคืนเงิน กรุณาติดต่อเรา", 409);

  const updated = await getDb()
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(bookings.id, b.id), inArray(bookings.status, ["requested", "accepted"])))
    .returning({ id: bookings.id });
  if (updated.length === 0) return fail("ยกเลิกรายการนี้ไม่ได้แล้ว", 409);
  return NextResponse.json({ ok: true });
}

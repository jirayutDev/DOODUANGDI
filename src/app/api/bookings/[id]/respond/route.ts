import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { currentUserId, fail, loadBooking } from "@/lib/booking-api";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

// หมอดูตอบรับ/ปฏิเสธคำขอคิว (รับแล้วลูกค้าถึงจะเห็นปุ่มจ่ายเงิน)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const b = await loadBooking((await params).id);
  if (!b || b.morDuId !== userId) return fail("ไม่พบรายการนี้", 404);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("ข้อมูลไม่ถูกต้อง", 400);
  if (b.status !== "requested") return fail("รายการนี้ตอบไปแล้ว", 409);

  const db = getDb();
  if (parsed.data.action === "accept") {
    // ห้ามรับคิวที่เวลาชนกับคิวอื่นที่รับไว้/ชำระแล้ว
    const clash = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.morDuId, userId),
          inArray(bookings.status, ["accepted", "paid"]),
          ne(bookings.id, b.id),
          lt(bookings.startsAt, b.endsAt),
          gt(bookings.endsAt, b.startsAt)
        )
      )
      .limit(1);
    if (clash.length > 0) return fail("เวลานี้ชนกับคิวอื่นที่คุณรับไว้แล้ว", 409);
  }

  const updated = await db
    .update(bookings)
    .set({ status: parsed.data.action === "accept" ? "accepted" : "declined", updatedAt: new Date() })
    .where(and(eq(bookings.id, b.id), eq(bookings.status, "requested")))
    .returning({ id: bookings.id });
  if (updated.length === 0) return fail("รายการนี้ตอบไปแล้ว", 409);
  return NextResponse.json({ ok: true });
}

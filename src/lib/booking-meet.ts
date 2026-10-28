import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, morDus } from "@/db/schema";
import { createMeetLink } from "@/lib/google-meet";

// สร้างห้อง Google Meet ให้การจองที่ชำระแล้ว (ทำหลังหัก coin เสร็จ ล้มเหลวไม่กระทบการชำระ หมอดูวางลิงก์เองได้)
// เรียกซ้ำปลอดภัย: ถ้ามีลิงก์แล้วจะไม่ทำอะไร และ Google ใช้ requestId = id การจอง จึงไม่เกิดห้องซ้อน
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

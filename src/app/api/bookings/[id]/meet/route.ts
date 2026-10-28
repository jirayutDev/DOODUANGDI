import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { isMeetUrl } from "@/lib/booking";
import { attachMeetLink } from "@/lib/booking-meet";
import { currentUserId, fail, loadBooking } from "@/lib/booking-api";

const schema = z.object({ meetUrl: z.string().trim().max(200).optional() });

// หมอดูวางลิงก์ Google Meet เอง (กรณีระบบสร้างให้ไม่สำเร็จ) หรือไม่ส่งลิงก์ = ให้ระบบลองสร้างอีกครั้ง
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const b = await loadBooking((await params).id);
  if (!b || b.morDuId !== userId) return fail("ไม่พบรายการนี้", 404);
  if (b.status !== "paid") return fail("ตั้งลิงก์ได้เฉพาะคิวที่ชำระเงินแล้ว", 409);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("ข้อมูลไม่ถูกต้อง", 400);

  if (!parsed.data.meetUrl) {
    await attachMeetLink(b.id);
    const fresh = await loadBooking(b.id);
    if (!fresh?.meetUrl) return fail("ระบบสร้างลิงก์ Google Meet ไม่สำเร็จ วางลิงก์ที่สร้างเองแทนได้", 502);
    return NextResponse.json({ ok: true, meetUrl: fresh.meetUrl });
  }
  if (!isMeetUrl(parsed.data.meetUrl)) return fail("ต้องเป็นลิงก์ Google Meet (https://meet.google.com/...)", 400);
  await getDb()
    .update(bookings)
    .set({ meetUrl: parsed.data.meetUrl.trim(), updatedAt: new Date() })
    .where(and(eq(bookings.id, b.id), eq(bookings.status, "paid")));
  return NextResponse.json({ ok: true, meetUrl: parsed.data.meetUrl.trim() });
}

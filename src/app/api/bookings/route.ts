import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { bookings, morDus } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { BOOKING_DURATIONS, checkStartTime, priceFor, splitPrice } from "@/lib/booking";
import { getPricing } from "@/lib/pricing";
import { currentUserId, fail } from "@/lib/booking-api";

const schema = z.object({
  morDuId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  durationMin: z.number().refine((n) => (BOOKING_DURATIONS as readonly number[]).includes(n)),
  topic: z.string().trim().min(5).max(300),
});

// ลูกค้าขอคิวปรึกษาหมอดู (ยังไม่จ่ายเงิน รอหมอดูตอบรับก่อน)
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  if (!(await rateLimit(`booking:${userId}`, 10, 60 * 60 * 1000))) return fail("ขอคิวถี่เกินไป ลองใหม่ภายหลัง", 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("ข้อมูลไม่ถูกต้อง (หัวข้อที่อยากปรึกษาอย่างน้อย 5 ตัวอักษร)", 400);
  const { morDuId, startsAt, durationMin, topic } = parsed.data;
  if (morDuId === userId) return fail("จองคิวตัวเองไม่ได้", 400);

  const start = new Date(startsAt);
  const check = checkStartTime(start);
  if (!check.ok) return fail(check.reason, 400);

  const db = getDb();
  const [m] = await db
    .select()
    .from(morDus)
    .where(and(eq(morDus.userId, morDuId), eq(morDus.status, "approved")))
    .limit(1);
  if (!m || !m.priceLiveMinute || m.priceLiveMinute <= 0) return fail("หมอดูท่านนี้ยังไม่เปิดรับจองคิว", 400);

  // จำกัดคำขอที่ค้างอยู่ กันขอคิวทิ้งไว้จำนวนมาก
  const [{ n: open }] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.customerId, userId), inArray(bookings.status, ["requested", "accepted"])));
  if (open >= 5) return fail("มีคำขอคิวที่รอดำเนินการหลายรายการแล้ว จัดการรายการเดิมก่อนนะ", 429);

  // ราคาเป็น coin (coin ต่อนาทีของหมอดู x จำนวนนาที) ค่าบริการเว็บตามเปอร์เซ็นต์ที่แอดมินตั้ง
  const priceCoins = priceFor(m.priceLiveMinute, durationMin);
  if (priceCoins < 1) return fail("ราคาคิวนี้ไม่ถูกต้อง", 400);
  const { commissionCoins } = splitPrice(priceCoins, (await getPricing()).morDuCommissionPercent);

  const [created] = await db
    .insert(bookings)
    .values({
      customerId: userId,
      morDuId,
      startsAt: start,
      endsAt: new Date(start.getTime() + durationMin * 60_000),
      durationMin,
      topic,
      priceCoins,
      commissionCoins,
    })
    .returning({ id: bookings.id });
  return NextResponse.json({ id: created.id });
}

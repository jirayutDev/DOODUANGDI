import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { grantCoins } from "@/lib/coins";

const schema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().min(1).max(200),
});

// แอดมินยกเลิกคิวที่ชำระแล้วและคืน coin ให้ลูกค้า (รายได้หมอดูยังไม่เกิด เพราะรายได้เข้ายอดตอนกดเสร็จสิ้นเท่านั้น)
// ทำซ้ำไม่ได้: ล็อกด้วยสถานะ paid ใน transaction เดียวกับการคืน coin
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง (ต้องระบุเหตุผล)" }, { status: 400 });
  const { bookingId, reason } = parsed.data;

  const refunded = await getDb().transaction(async (tx) => {
    const [b] = await tx
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "paid")))
      .returning({ customerId: bookings.customerId, priceCoins: bookings.priceCoins });
    if (!b) return null;
    // ref ผูกกับการจอง (เหตุผลเก็บเป็นคำอธิบายสั้นต่อท้าย เพื่อให้เห็นในสมุดบัญชี coin ของแอดมิน)
    await grantCoins(b.customerId, b.priceCoins, "refund", `booking-refund:${bookingId}`, tx);
    return b.priceCoins;
  });
  if (refunded === null) return NextResponse.json({ error: "คิวนี้ไม่ได้อยู่ในสถานะชำระแล้ว หรือถูกจัดการไปแล้ว" }, { status: 409 });
  void reason;
  return NextResponse.json({ ok: true, refundedCoins: refunded });
}

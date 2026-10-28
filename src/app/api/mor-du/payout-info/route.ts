import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { currentUserId, fail } from "@/lib/booking-api";

const schema = z.object({ payoutInfo: z.string().trim().min(5).max(300) });

// หมอดูบันทึกช่องทางรับเงิน (แอดมินเห็นเพื่อโอนรายได้ให้ ไม่แสดงต่อสาธารณะ)
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return fail("กรุณาเข้าสู่ระบบก่อน", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("กรอกช่องทางรับเงินให้ครบ (ธนาคาร เลขบัญชี ชื่อบัญชี หรือเบอร์พร้อมเพย์)", 400);
  const updated = await getDb()
    .update(morDus)
    .set({ payoutInfo: parsed.data.payoutInfo, updatedAt: new Date() })
    .where(eq(morDus.userId, userId))
    .returning({ id: morDus.userId });
  if (updated.length === 0) return fail("ไม่พบข้อมูลหมอดูของคุณ", 404);
  return NextResponse.json({ ok: true });
}

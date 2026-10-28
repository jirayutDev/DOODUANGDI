import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { getDb } from "@/db";
import { morDuLedger } from "@/db/schema";

const schema = z.object({
  morDuId: z.string().uuid(),
  amountCoins: z.number().int().min(1).max(1_000_000),
  note: z.string().trim().min(1).max(200),
});

// แอดมินบันทึกว่าโอนรายได้ให้หมอดูแล้ว (ยอดเป็น coin หักจากยอดคงเหลือ ห้ามโอนเกินยอด)
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { morDuId, amountCoins, note } = parsed.data;

  const ok = await getDb().transaction(async (tx) => {
    const [{ bal }] = await tx
      .select({ bal: sql<number>`coalesce(sum(${morDuLedger.amountCoins}), 0)::int` })
      .from(morDuLedger)
      .where(eq(morDuLedger.morDuId, morDuId));
    if (amountCoins > bal) return false;
    await tx.insert(morDuLedger).values({ morDuId, amountCoins: -amountCoins, kind: "payout", note });
    return true;
  });
  if (!ok) return NextResponse.json({ error: "ยอดที่บันทึกเกินยอดคงเหลือของหมอดู" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { getDb } from "@/db";
import { coinTransactions, coinWallets } from "@/db/schema";
import { grantCoins } from "@/lib/coins";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 100000),
  reason: z.string().trim().min(1).max(100),
});

// แอดมินเพิ่ม/หักเหรียญของผู้ใช้ (บวก = เพิ่ม, ลบ = หัก) บันทึกใน ledger พร้อมเหตุผลเสมอ
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { userId, amount, reason } = parsed.data;

  if (amount > 0) {
    await grantCoins(userId, amount, "admin", reason);
    return NextResponse.json({ ok: true });
  }

  const n = -amount;
  const ok = await getDb().transaction(async (tx) => {
    const updated = await tx
      .update(coinWallets)
      .set({ balance: sql`${coinWallets.balance} - ${n}`, updatedAt: new Date() })
      .where(and(eq(coinWallets.userId, userId), gte(coinWallets.balance, n)))
      .returning({ userId: coinWallets.userId });
    if (updated.length === 0) return false;
    await tx.insert(coinTransactions).values({ userId, amount, kind: "admin", ref: reason });
    return true;
  });
  if (!ok) return NextResponse.json({ error: "เหรียญของผู้ใช้ไม่พอให้หัก" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

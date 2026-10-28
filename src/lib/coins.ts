import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { coinCodeRedemptions, coinCodes, coinTransactions, coinWallets } from "@/db/schema";
import { FEATURE_COSTS, type FeatureKey } from "@/lib/coin-config";
import { getPricing } from "@/lib/pricing";

// รหัส error ที่ client ใช้แยกว่าจะพาไปหน้าไหน
export type CoinErrorCode = "login_required" | "insufficient_coins";

function fail(code: CoinErrorCode, error: string, status: number, extra?: object) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

export async function getBalance(userId: string): Promise<number> {
  const [w] = await getDb().select().from(coinWallets).where(eq(coinWallets.userId, userId)).limit(1);
  return w?.balance ?? 0;
}

type Db = ReturnType<typeof getDb>;
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// ส่ง tx มาเมื่ออยากให้การเติม coin อยู่ใน transaction เดียวกับงานอื่น (เช่น ยืนยันการชำระเงิน)
export async function grantCoins(userId: string, amount: number, kind: string, ref?: string, tx?: DbTx) {
  if (amount <= 0) return;
  const run = async (ex: Db | DbTx) => {
    await ex
      .insert(coinWallets)
      .values({ userId, balance: amount })
      .onConflictDoUpdate({
        target: coinWallets.userId,
        set: { balance: sql`${coinWallets.balance} + ${amount}`, updatedAt: new Date() },
      });
    await ex.insert(coinTransactions).values({ userId, amount, kind, ref });
  };
  if (tx) await run(tx);
  else await getDb().transaction(run);
}

// ให้ coin ต้อนรับครั้งเดียว: ได้เฉพาะตอนสร้าง wallet ของผู้ใช้เป็นครั้งแรก (insert สำเร็จแถวเดียวเท่านั้น)
export async function ensureWelcomeCoins(userId: string): Promise<void> {
  const welcome = (await getPricing()).welcomeCoins;
  if (welcome <= 0) return;
  await getDb().transaction(async (tx) => {
    const created = await tx
      .insert(coinWallets)
      .values({ userId, balance: welcome })
      .onConflictDoNothing()
      .returning({ id: coinWallets.userId });
    if (created.length === 0) return;
    await tx.insert(coinTransactions).values({ userId, amount: welcome, kind: "bonus", ref: "welcome" });
  });
}

// ตัด coin แบบอะตอมมิก: สำเร็จเฉพาะเมื่อยอดพอ ไม่มีทางติดลบแม้กดพร้อมกันหลายครั้ง
export async function spendCoins(userId: string, amount: number, ref: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const updated = await tx
      .update(coinWallets)
      .set({ balance: sql`${coinWallets.balance} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(coinWallets.userId, userId), gte(coinWallets.balance, amount)))
      .returning({ balance: coinWallets.balance });
    if (updated.length === 0) return false;
    await tx.insert(coinTransactions).values({ userId, amount: -amount, kind: "spend", ref });
    return true;
  });
}

export type ChargeResult =
  | { ok: false; res: NextResponse }
  | { ok: true; userId: string; cost: number; refund: () => Promise<void> };

// ด่านเดียวของทุกบริการที่เสียเงิน: ล็อกอิน -> หัก coin
// เรียกหลังตรวจ input เสร็จ และก่อนเรียก AI; ถ้า AI พัง ให้เรียก refund()
export async function chargeFeature(feature: FeatureKey): Promise<ChargeResult> {
  const { label } = FEATURE_COSTS[feature];
  const cost = (await getPricing()).costs[feature];
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    userId = (await supabase.auth.getUser()).data.user?.id;
  } catch {
    userId = undefined;
  }
  if (!userId) return { ok: false, res: fail("login_required", "กรุณาเข้าสู่ระบบก่อนใช้งาน", 401) };

  try {
    if (!(await spendCoins(userId, cost, feature))) {
      return {
        ok: false,
        res: fail("insufficient_coins", `coin ไม่พอสำหรับ${label} (ต้องใช้ ${cost} coin)`, 402, { cost }),
      };
    }
  } catch {
    return { ok: false, res: NextResponse.json({ error: "ระบบ coin ใช้งานไม่ได้ชั่วคราว" }, { status: 503 }) };
  }
  const uid = userId;
  return { ok: true, userId: uid, cost, refund: async () => {
      for (let i = 0; i < 2; i++) {
        try {
          await grantCoins(uid, cost, "refund", feature);
          return;
        } catch (e) {
          console.error("coin refund failed", i + 1, e instanceof Error ? e.message : "unknown");
        }
      }
    },
  };
}

export type RedeemOutcome =
  | { ok: true; coins: number }
  | { ok: false; reason: "invalid" | "expired" | "used_up" | "already_redeemed" };

export async function redeemCode(userId: string, rawCode: string): Promise<RedeemOutcome> {
  const code = rawCode.trim().toUpperCase();
  return getDb().transaction(async (tx): Promise<RedeemOutcome> => {
    const [c] = await tx.select().from(coinCodes).where(eq(coinCodes.code, code)).for("update").limit(1);
    if (!c || !c.active) return { ok: false, reason: "invalid" };
    if (c.expiresAt && c.expiresAt < new Date()) return { ok: false, reason: "expired" };
    if (c.usedCount >= c.maxUses) return { ok: false, reason: "used_up" };
    const inserted = await tx.insert(coinCodeRedemptions).values({ code, userId }).onConflictDoNothing().returning();
    if (inserted.length === 0) return { ok: false, reason: "already_redeemed" };
    await tx
      .update(coinCodes)
      .set({ usedCount: sql`${coinCodes.usedCount} + 1` })
      .where(eq(coinCodes.code, code));
    await tx
      .insert(coinWallets)
      .values({ userId, balance: c.coins })
      .onConflictDoUpdate({
        target: coinWallets.userId,
        set: { balance: sql`${coinWallets.balance} + ${c.coins}`, updatedAt: new Date() },
      });
    await tx.insert(coinTransactions).values({ userId, amount: c.coins, kind: "code", ref: code });
    return { ok: true, coins: c.coins };
  });
}

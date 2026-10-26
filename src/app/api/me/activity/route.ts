import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { coinTransactions, payments } from "@/db/schema";
import { getBalance } from "@/lib/coins";

const PAGE_SIZE = 20;

// กลุ่มตัวกรองของหน้ากิจกรรม -> kind ใน ledger
const KIND_GROUPS: Record<string, string[]> = {
  spend: ["spend"],
  topup: ["topup"],
  bonus: ["bonus", "code"],
  refund: ["refund"],
};

// สรุปการใช้ coin + ประวัติธุรกรรมของผู้ใช้ที่ล็อกอินอยู่ (ดูได้เฉพาะของตัวเอง)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน", code: "login_required" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const range = params.get("range") === "30d" ? "30d" : "all";
  const kinds = KIND_GROUPS[params.get("kind") ?? ""];
  const offset = Math.max(0, Math.min(Number.parseInt(params.get("offset") ?? "0", 10) || 0, 10_000));
  const wantSummary = params.get("summary") === "1";

  const db = getDb();
  try {
    const itemWhere = and(eq(coinTransactions.userId, user.id), kinds ? inArray(coinTransactions.kind, kinds) : undefined);
    const rows = await db
      .select({
        id: coinTransactions.id,
        amount: coinTransactions.amount,
        kind: coinTransactions.kind,
        ref: coinTransactions.ref,
        createdAt: coinTransactions.createdAt,
        baht: payments.amountBaht,
      })
      .from(coinTransactions)
      // topup เก็บ payment id ใน ref (ข้ามถ้าไม่ใช่ uuid ที่ตรง) เพื่อแสดงจำนวนเงินบาท
      .leftJoin(
        payments,
        and(eq(coinTransactions.kind, "topup"), sql`${payments.id}::text = ${coinTransactions.ref}`, eq(payments.userId, user.id))
      )
      .where(itemWhere)
      .orderBy(desc(coinTransactions.createdAt), desc(coinTransactions.id))
      .limit(PAGE_SIZE + 1)
      .offset(offset);

    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE);

    if (!wantSummary) return NextResponse.json({ items, hasMore });

    const since = range === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null;
    const sumWhere = and(eq(coinTransactions.userId, user.id), since ? gte(coinTransactions.createdAt, since) : undefined);

    const [byKind, bySpend, topupBaht, balance] = await Promise.all([
      db
        .select({
          kind: coinTransactions.kind,
          total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int`,
        })
        .from(coinTransactions)
        .where(sumWhere)
        .groupBy(coinTransactions.kind),
      db
        .select({
          ref: coinTransactions.ref,
          uses: sql<number>`count(*)::int`,
          coins: sql<number>`coalesce(-sum(${coinTransactions.amount}), 0)::int`,
        })
        .from(coinTransactions)
        .where(and(sumWhere, eq(coinTransactions.kind, "spend")))
        .groupBy(coinTransactions.ref)
        .orderBy(sql`2 desc`),
      db
        .select({ baht: sql<number>`coalesce(sum(${payments.amountBaht}), 0)::int` })
        .from(payments)
        .where(
          and(
            eq(payments.userId, user.id),
            eq(payments.purpose, "coin_topup"),
            eq(payments.status, "confirmed"),
            since ? gte(payments.confirmedAt, since) : undefined
          )
        ),
      getBalance(user.id),
    ]);

    const total = (k: string[]) => byKind.filter((r) => k.includes(r.kind)).reduce((s, r) => s + r.total, 0);
    const spent = -total(["spend"]);
    const refunded = total(["refund"]);

    return NextResponse.json({
      items,
      hasMore,
      summary: {
        balance,
        topupCoins: total(["topup"]),
        topupBaht: topupBaht[0]?.baht ?? 0,
        bonusCoins: total(["bonus", "code"]),
        spentCoins: spent - refunded, // ใช้จริงหลังหักที่คืน
        refundedCoins: refunded,
        byFeature: bySpend.filter((r) => r.ref),
      },
    });
  } catch {
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 503 });
  }
}

import Link from "next/link";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinCodes, coinTransactions, coinWallets, morDus, payments } from "@/db/schema";
import { describeTransaction } from "@/lib/coin-config";
import { DataTable, EmptyRow, fmtDate, Panel, StatTile, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "./shell";

const PAY_STATUS = {
  pending: { label: "รอชำระ", tone: "neutral" },
  awaiting_confirmation: { label: "รอตรวจ", tone: "warning" },
  confirmed: { label: "สำเร็จ", tone: "success" },
  rejected: { label: "ยกเลิก", tone: "danger" },
} as const;

async function loadDashboard() {
  const db = getDb();
  // เริ่มวันตามเวลาไทย (UTC+7) ไม่ขึ้นกับโซนเวลาของเซิร์ฟเวอร์
  const DAY = 86_400_000;
  const BKK = 7 * 3_600_000;
  const startOfToday = new Date(Math.floor((Date.now() + BKK) / DAY) * DAY - BKK);
  const [[awaiting], [mor], [codes], [rev], [revToday], [wallets], recentPayments, recentLedger] = await Promise.all([
    db.select({ n: count() }).from(payments).where(eq(payments.status, "awaiting_confirmation")),
    db.select({ n: count() }).from(morDus).where(eq(morDus.status, "pending")),
    db.select({ n: count() }).from(coinCodes).where(eq(coinCodes.active, true)),
    db.select({ baht: sql<number>`coalesce(sum(${payments.amountBaht}), 0)::int` }).from(payments).where(eq(payments.status, "confirmed")),
    db
      .select({ baht: sql<number>`coalesce(sum(${payments.amountBaht}), 0)::int` })
      .from(payments)
      .where(and(eq(payments.status, "confirmed"), gte(payments.confirmedAt, startOfToday))),
    db.select({ n: count(), coins: sql<number>`coalesce(sum(${coinWallets.balance}), 0)::int` }).from(coinWallets),
    db.select().from(payments).orderBy(desc(payments.createdAt)).limit(8),
    db.select().from(coinTransactions).orderBy(desc(coinTransactions.createdAt)).limit(8),
  ]);
  return { awaiting: awaiting.n, mor: mor.n, codes: codes.n, revenue: rev.baht, revenueToday: revToday.baht, wallets: wallets.n, coins: wallets.coins, recentPayments, recentLedger };
}

export default async function AdminPage() {
  await requireAdminPage();
  const base = adminBase() === "/" ? "" : adminBase();
  let d: Awaited<ReturnType<typeof loadDashboard>> | null = null;
  try {
    d = await loadDashboard();
  } catch {
    d = null;
  }

  return (
    <AdminShell title="ภาพรวม" description="สรุปรายได้ coin และงานที่รอดำเนินการ">
      {!d ? (
        <Panel className="p-6 text-muted-foreground">โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่อฐานข้อมูล</Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="รายได้สะสม" value={`${d.revenue.toLocaleString("th-TH")} บาท`} hint={`วันนี้ ${d.revenueToday.toLocaleString("th-TH")} บาท`} />
            <StatTile label="กระเป๋า coin" value={d.wallets.toLocaleString("th-TH")} hint={`coin ค้างในระบบ ${d.coins.toLocaleString("th-TH")}`} />
            <StatTile label="รอตรวจการชำระเงิน" value={String(d.awaiting)} hint="กดยืนยันที่เมนูการชำระเงิน" />
            <StatTile label="ใบสมัครหมอดูรออนุมัติ" value={String(d.mor)} hint={`โค้ดที่เปิดอยู่ ${d.codes}`} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold">การชำระเงินล่าสุด</h2>
                <Link href={`${base}/payments`} className="text-sm text-primary hover:underline">
                  ดูทั้งหมด
                </Link>
              </div>
              <DataTable className="[&_table]:min-w-0">
                <thead>
                  <tr>
                    <Th>เวลา</Th>
                    <Th>รายการ</Th>
                    <Th className="text-right">ยอด</Th>
                    <Th>สถานะ</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentPayments.map((p) => {
                    const s = PAY_STATUS[p.status];
                    return (
                      <Tr key={p.id}>
                        <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(p.createdAt)}</Td>
                        <Td>{p.purpose === "coin_topup" ? `เติม ${(p.coins ?? 0).toLocaleString("th-TH")} coin` : "รายการเก่า (สมาชิก)"}</Td>
                        <Td className="text-right">{p.amountBaht.toLocaleString("th-TH")} บาท</Td>
                        <Td>
                          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                        </Td>
                      </Tr>
                    );
                  })}
                  {d.recentPayments.length === 0 && <EmptyRow cols={4}>ยังไม่มีรายการ</EmptyRow>}
                </tbody>
              </DataTable>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold">ความเคลื่อนไหว coin ล่าสุด</h2>
                <Link href={`${base}/ledger`} className="text-sm text-primary hover:underline">
                  ดูทั้งหมด
                </Link>
              </div>
              <DataTable className="[&_table]:min-w-0">
                <thead>
                  <tr>
                    <Th>เวลา</Th>
                    <Th>รายการ</Th>
                    <Th>ผู้ใช้</Th>
                    <Th className="text-right">coin</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentLedger.map((h) => (
                    <Tr key={h.id}>
                      <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(h.createdAt)}</Td>
                      <Td>{describeTransaction(h)}</Td>
                      <Td>
                        <Link href={`${base}/users/${h.userId}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                          {h.userId.slice(0, 8)}
                        </Link>
                      </Td>
                      <Td className={`text-right font-semibold ${h.amount > 0 ? "text-primary" : "text-soft-text"}`}>{h.amount > 0 ? `+${h.amount}` : h.amount}</Td>
                    </Tr>
                  ))}
                  {d.recentLedger.length === 0 && <EmptyRow cols={4}>ยังไม่มีรายการ</EmptyRow>}
                </tbody>
              </DataTable>
            </section>
          </div>
        </>
      )}
    </AdminShell>
  );
}

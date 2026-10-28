import { count, desc, eq, sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { morDuLedger, morDus } from "@/db/schema";
import { commissionPercent } from "@/lib/booking";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../shell";
import { PayoutForm } from "./payout-form";

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const page = parsePage((await searchParams).page);
  const base = adminBase() === "/" ? "" : adminBase();

  const db = getDb();
  const [[{ n: total }], rows, history] = await Promise.all([
    db.select({ n: count() }).from(morDus),
    db
      .select({
        userId: morDus.userId,
        name: morDus.displayName,
        payoutInfo: morDus.payoutInfo,
        earned: sql<number>`coalesce(sum(case when ${morDuLedger.amountBaht} > 0 then ${morDuLedger.amountBaht} else 0 end), 0)::int`,
        paidOut: sql<number>`coalesce(-sum(case when ${morDuLedger.amountBaht} < 0 then ${morDuLedger.amountBaht} else 0 end), 0)::int`,
        balance: sql<number>`coalesce(sum(${morDuLedger.amountBaht}), 0)::int`,
      })
      .from(morDus)
      .leftJoin(morDuLedger, eq(morDuLedger.morDuId, morDus.userId))
      .groupBy(morDus.userId, morDus.displayName, morDus.payoutInfo)
      .orderBy(desc(sql`coalesce(sum(${morDuLedger.amountBaht}), 0)`), morDus.displayName)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ l: morDuLedger, name: morDus.displayName })
      .from(morDuLedger)
      .leftJoin(morDus, eq(morDus.userId, morDuLedger.morDuId))
      .where(eq(morDuLedger.kind, "payout"))
      .orderBy(desc(morDuLedger.createdAt))
      .limit(10),
  ]);

  return (
    <AdminShell title="โอนเงินหมอดู" description={`ยอดรายได้ของหมอดู (หลังหักค่าบริการ ${commissionPercent()}%) โอนเงินออกนอกระบบตามช่องทางที่หมอดูแจ้ง แล้วบันทึกที่นี่เพื่อหักยอดคงเหลือ`}>
      <DataTable className="[&_table]:min-w-[860px]">
        <thead>
          <tr>
            <Th>หมอดู</Th>
            <Th>ช่องทางรับเงิน</Th>
            <Th className="text-right">รายได้สะสม</Th>
            <Th className="text-right">โอนแล้ว</Th>
            <Th className="text-right">คงเหลือ</Th>
            <Th className="text-right">บันทึกการโอน</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.userId}>
              <Td className="font-medium">{r.name}</Td>
              <Td className="max-w-[260px] whitespace-pre-line text-soft-text">{r.payoutInfo ?? <span className="text-muted-foreground">ยังไม่ได้กรอก</span>}</Td>
              <Td className="text-right">{r.earned.toLocaleString("th-TH")}</Td>
              <Td className="text-right text-muted-foreground">{r.paidOut.toLocaleString("th-TH")}</Td>
              <Td className="text-right font-bold text-primary">{r.balance.toLocaleString("th-TH")}</Td>
              <Td className="text-right">
                <div className="flex justify-end">{r.balance > 0 ? <PayoutForm morDuId={r.userId} balance={r.balance} /> : <span className="text-muted-foreground">-</span>}</div>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={6}>ยังไม่มีหมอดู</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/payouts`} />

      <h2 className="mt-8 mb-2 text-lg font-bold">การโอนล่าสุด</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>เวลา</Th>
            <Th>หมอดู</Th>
            <Th>หมายเหตุ</Th>
            <Th className="text-right">บาท</Th>
          </tr>
        </thead>
        <tbody>
          {history.map(({ l, name }) => (
            <Tr key={l.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(l.createdAt)}</Td>
              <Td>{name ?? l.morDuId.slice(0, 8)}</Td>
              <Td className="text-muted-foreground">{l.note ?? "-"}</Td>
              <Td className="text-right font-semibold">{(-l.amountBaht).toLocaleString("th-TH")}</Td>
            </Tr>
          ))}
          {history.length === 0 && <EmptyRow cols={4}>ยังไม่มีการโอน</EmptyRow>}
        </tbody>
      </DataTable>
    </AdminShell>
  );
}

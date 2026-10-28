import Link from "next/link";
import { count, desc } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinTransactions } from "@/db/schema";
import { describeTransaction } from "@/lib/coin-config";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../shell";

export default async function AdminLedgerPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const page = parsePage((await searchParams).page);
  const base = adminBase() === "/" ? "" : adminBase();

  const db = getDb();
  const [[{ n: total }], rows] = await Promise.all([
    db.select({ n: count() }).from(coinTransactions),
    db.select().from(coinTransactions).orderBy(desc(coinTransactions.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  ]);

  return (
    <AdminShell title="ความเคลื่อนไหว coin" description="ประวัติเติม ใช้ คืน และปรับ coin ของทุกผู้ใช้ เรียงจากใหม่ไปเก่า">
      <DataTable>
        <thead>
          <tr>
            <Th>เวลา</Th>
            <Th>รายการ</Th>
            <Th>หมายเหตุ</Th>
            <Th>ผู้ใช้</Th>
            <Th className="text-right">coin</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <Tr key={h.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(h.createdAt)}</Td>
              <Td>{describeTransaction(h)}</Td>
              <Td className="max-w-[260px] truncate text-muted-foreground">{h.kind === "admin" ? (h.ref ?? "-") : "-"}</Td>
              <Td>
                <Link href={`${base}/users/${h.userId}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                  {h.userId.slice(0, 8)}
                </Link>
              </Td>
              <Td className={`text-right font-semibold ${h.amount > 0 ? "text-primary" : "text-soft-text"}`}>{h.amount > 0 ? `+${h.amount}` : h.amount}</Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={5}>ยังไม่มีรายการ</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/ledger`} />
    </AdminShell>
  );
}

import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { bookings, morDus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/booking";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell, FilterTabs } from "../shell";

const STATUSES = ["requested", "accepted", "paid", "completed", "declined", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status: Status = STATUSES.find((s) => s === sp.status) ?? "paid";
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const db = getDb();
  const [[{ n: total }], rows, counts] = await Promise.all([
    db.select({ n: count() }).from(bookings).where(eq(bookings.status, status)),
    db
      .select({ b: bookings, name: morDus.displayName })
      .from(bookings)
      .leftJoin(morDus, eq(morDus.userId, bookings.morDuId))
      .where(eq(bookings.status, status))
      .orderBy(desc(bookings.startsAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ status: bookings.status, n: count() }).from(bookings).groupBy(bookings.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <AdminShell title="การจองคิวหมอดู" description="คิวปรึกษาวิดีโอทั้งหมด (ลูกค้าขอ → หมอดูรับ → ชำระเงิน → ลิงก์ Google Meet → เสร็จสิ้น) ยกเลิก/คืนเงินคิวที่ชำระแล้วทำนอกระบบ ตามที่ลูกค้าติดต่อมา">
      <FilterTabs
        base={`${base}/bookings`}
        param="status"
        current={status}
        options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s].label, count: countOf(s) }))}
      />
      <DataTable className="[&_table]:min-w-[900px]">
        <thead>
          <tr>
            <Th>เวลานัด</Th>
            <Th>หมอดู</Th>
            <Th>ลูกค้า</Th>
            <Th className="text-right">นาที</Th>
            <Th className="text-right">ราคา</Th>
            <Th className="text-right">เว็บเก็บ</Th>
            <Th>สถานะ</Th>
            <Th>Meet</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ b, name }) => {
            const s = STATUS_LABEL[b.status];
            return (
              <Tr key={b.id}>
                <Td className="whitespace-nowrap">{fmtDate(b.startsAt)}</Td>
                <Td>{name ?? <span className="font-mono text-xs">{b.morDuId.slice(0, 8)}</span>}</Td>
                <Td>
                  <Link href={`${base}/users/${b.customerId}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                    {b.customerId.slice(0, 8)}
                  </Link>
                </Td>
                <Td className="text-right">{b.durationMin}</Td>
                <Td className="text-right font-semibold">{b.priceBaht.toLocaleString("th-TH")}</Td>
                <Td className="text-right text-muted-foreground">{b.commissionBaht.toLocaleString("th-TH")}</Td>
                <Td>
                  <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                </Td>
                <Td>
                  {b.meetUrl ? (
                    <a href={b.meetUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      เปิด
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </Td>
              </Tr>
            );
          })}
          {rows.length === 0 && <EmptyRow cols={8}>ไม่มีรายการในสถานะนี้</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/bookings`} params={{ status }} />
    </AdminShell>
  );
}

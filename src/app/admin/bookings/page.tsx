import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { activeFilters, cleanText, escapeLike, pickOne, thaiDayEndExclusive, thaiDayStart } from "@/lib/admin-filters";
import { FilterBar } from "@/components/admin/filter-bar";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { bookings, morDus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/booking";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell, FilterTabs } from "../shell";
import { RefundButton } from "./refund-button";

const STATUSES = ["requested", "accepted", "paid", "completed", "declined", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

type Sp = { status?: string; page?: string; q?: string; from?: string; to?: string; dur?: string; min?: string };
const DURATIONS = ["15", "30", "45", "60"] as const;
const MIN_PRICES = ["50", "200", "500"] as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Sp> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status: Status = STATUSES.find((s) => s === sp.status) ?? "paid";
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const q = cleanText(sp.q);
  const dur = pickOne(sp.dur, DURATIONS);
  const min = pickOne(sp.min, MIN_PRICES);
  const from = thaiDayStart(sp.from) ? sp.from : undefined;
  const to = thaiDayEndExclusive(sp.to) ? sp.to : undefined;
  const where = and(
    eq(bookings.status, status),
    q ? or(ilike(morDus.displayName, `%${escapeLike(q)}%`), sql`${bookings.customerId}::text ilike ${`${escapeLike(q)}%`}`) : undefined,
    from ? gte(bookings.startsAt, thaiDayStart(from)!) : undefined,
    to ? lt(bookings.startsAt, thaiDayEndExclusive(to)!) : undefined,
    dur ? eq(bookings.durationMin, Number(dur)) : undefined,
    min ? gte(bookings.priceCoins, Number(min)) : undefined
  );
  const filters = activeFilters({ q, from, to, dur, min });

  const db = getDb();
  const [[{ n: total }], rows, counts] = await Promise.all([
    db.select({ n: count() }).from(bookings).leftJoin(morDus, eq(morDus.userId, bookings.morDuId)).where(where),
    db
      .select({ b: bookings, name: morDus.displayName })
      .from(bookings)
      .leftJoin(morDus, eq(morDus.userId, bookings.morDuId))
      .where(where)
      .orderBy(desc(bookings.startsAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ status: bookings.status, n: count() }).from(bookings).groupBy(bookings.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <AdminShell title="การจองคิวหมอดู" description="คิวปรึกษาวิดีโอทั้งหมด (ลูกค้าขอ → หมอดูรับ → ชำระด้วย coin → ลิงก์ Google Meet → เสร็จสิ้น) คิวที่ชำระแล้วยกเลิกและคืน coin ได้ที่ปุ่มท้ายแถว">
      <FilterTabs
        base={`${base}/bookings`}
        param="status"
        current={status}
        options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s].label, count: countOf(s) }))}
      />
      <FilterBar
        path={`${base}/bookings`}
        values={filters}
        keep={{ status }}
        fields={[
          { name: "q", label: "ค้นหาหมอดู / รหัสลูกค้า", type: "text", placeholder: "ชื่อหมอดู หรือ 8 ตัวแรกของรหัส" },
          { name: "from", label: "เวลานัดตั้งแต่", type: "date" },
          { name: "to", label: "เวลานัดถึง", type: "date" },
          {
            name: "dur",
            label: "ความยาวคิว",
            type: "select",
            options: [{ value: "", label: "ทั้งหมด" }, ...DURATIONS.map((d) => ({ value: d, label: `${d} นาที` }))],
          },
          {
            name: "min",
            label: "ราคาขั้นต่ำ",
            type: "select",
            options: [{ value: "", label: "ทั้งหมด" }, ...MIN_PRICES.map((m) => ({ value: m, label: `≥ ${m} coin` }))],
          },
        ]}
      />
      <DataTable className="[&_table]:min-w-[900px]">
        <thead>
          <tr>
            <Th>เวลานัด</Th>
            <Th>หมอดู</Th>
            <Th>ลูกค้า</Th>
            <Th className="text-right">นาที</Th>
            <Th className="text-right">ราคา (coin)</Th>
            <Th className="text-right">เว็บเก็บ (coin)</Th>
            <Th>สถานะ</Th>
            <Th>Meet</Th>
            <Th className="text-right">จัดการ</Th>
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
                <Td className="text-right font-semibold">{b.priceCoins.toLocaleString("th-TH")}</Td>
                <Td className="text-right text-muted-foreground">{b.commissionCoins.toLocaleString("th-TH")}</Td>
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
                <Td className="text-right">
                  {b.status === "paid" ? (
                    <div className="flex justify-end">
                      <RefundButton bookingId={b.id} coins={b.priceCoins} />
                    </div>
                  ) : null}
                </Td>
              </Tr>
            );
          })}
          {rows.length === 0 && <EmptyRow cols={9}>{Object.keys(filters).length ? "ไม่พบรายการตามตัวกรอง" : "ไม่มีรายการในสถานะนี้"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/bookings`} params={{ status, ...filters }} />
    </AdminShell>
  );
}

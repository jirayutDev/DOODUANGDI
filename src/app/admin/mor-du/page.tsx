import { and, count, desc, eq, gte, ilike, isNotNull, isNull, lt, or } from "drizzle-orm";
import { activeFilters, cleanText, escapeLike, pickOne, thaiDayEndExclusive, thaiDayStart } from "@/lib/admin-filters";
import { FilterBar } from "@/components/admin/filter-bar";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { MorDuActions } from "./mor-du-actions";
import { AdminShell, FilterTabs } from "../shell";

const STATUSES = [
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "suspended", label: "ถูกพัก" },
  { value: "rejected", label: "ปฏิเสธ" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

type Sp = { status?: string; page?: string; q?: string; price?: string; from?: string; to?: string };

export default async function AdminMorDuPage({ searchParams }: { searchParams: Promise<Sp> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status: Status = STATUSES.find((s) => s.value === sp.status)?.value ?? "pending";
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const q = cleanText(sp.q);
  const price = pickOne(sp.price, ["set", "unset"] as const);
  const from = thaiDayStart(sp.from) ? sp.from : undefined;
  const to = thaiDayEndExclusive(sp.to) ? sp.to : undefined;
  const pat = `%${escapeLike(q)}%`;
  const where = and(
    eq(morDus.status, status),
    q ? or(ilike(morDus.displayName, pat), ilike(morDus.specialties, pat)) : undefined,
    price === "set" ? isNotNull(morDus.priceLiveMinute) : undefined,
    price === "unset" ? isNull(morDus.priceLiveMinute) : undefined,
    from ? gte(morDus.createdAt, thaiDayStart(from)!) : undefined,
    to ? lt(morDus.createdAt, thaiDayEndExclusive(to)!) : undefined
  );
  const filters = activeFilters({ q, price, from, to });

  const db = getDb();
  const [[{ n: total }], rows, counts] = await Promise.all([
    db.select({ n: count() }).from(morDus).where(where),
    db.select().from(morDus).where(where).orderBy(desc(morDus.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ status: morDus.status, n: count() }).from(morDus).groupBy(morDus.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <AdminShell title="หมอดู" description="อนุมัติ ปฏิเสธ หรือพักใช้งานหมอดูที่สมัครเข้ามา">
      <FilterTabs base={`${base}/mor-du`} param="status" current={status} options={STATUSES.map((s) => ({ ...s, count: countOf(s.value) }))} />
      <FilterBar
        path={`${base}/mor-du`}
        values={filters}
        keep={{ status }}
        fields={[
          { name: "q", label: "ค้นหาชื่อ/ความเชี่ยวชาญ", type: "text", placeholder: "เช่น ไพ่ยิปซี" },
          {
            name: "price",
            label: "ราคาคิววิดีโอ",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "set", label: "มีราคาคิววิดีโอ" },
              { value: "unset", label: "ยังไม่ตั้งราคาคิววิดีโอ" },
            ],
          },
          { name: "from", label: "สมัครตั้งแต่", type: "date" },
          { name: "to", label: "สมัครถึง", type: "date" },
        ]}
      />
      <DataTable className="[&_table]:min-w-[820px]">
        <thead>
          <tr>
            <Th>ชื่อ</Th>
            <Th>ความเชี่ยวชาญ</Th>
            <Th>ราคา</Th>
            <Th>สมัครเมื่อ</Th>
            <Th className="text-right">จัดการ</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <Tr key={m.userId}>
              <Td className="max-w-[320px]">
                <p className="font-medium">{m.displayName}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.bio}</p>
              </Td>
              <Td className="max-w-[220px] text-soft-text">{m.specialties}</Td>
              <Td className="whitespace-nowrap text-soft-text">
                ถามข้อละ {m.priceQuestion} บาท
                {m.priceLiveMinute ? <span className="block text-xs text-muted-foreground">แชทสด {m.priceLiveMinute} บาท/นาที</span> : null}
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(m.createdAt)}</Td>
              <Td className="text-right">
                <div className="flex justify-end">
                  <MorDuActions userId={m.userId} status={status} />
                </div>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={5}>{Object.keys(filters).length ? "ไม่พบรายการตามตัวกรอง" : "ไม่มีรายการในสถานะนี้"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/mor-du`} params={{ status, ...filters }} />
    </AdminShell>
  );
}

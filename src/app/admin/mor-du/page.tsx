import { count, desc, eq } from "drizzle-orm";
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

export default async function AdminMorDuPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status: Status = STATUSES.find((s) => s.value === sp.status)?.value ?? "pending";
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const db = getDb();
  const [[{ n: total }], rows, counts] = await Promise.all([
    db.select({ n: count() }).from(morDus).where(eq(morDus.status, status)),
    db.select().from(morDus).where(eq(morDus.status, status)).orderBy(desc(morDus.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ status: morDus.status, n: count() }).from(morDus).groupBy(morDus.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <AdminShell title="หมอดู" description="อนุมัติ ปฏิเสธ หรือพักใช้งานหมอดูที่สมัครเข้ามา">
      <FilterTabs base={`${base}/mor-du`} param="status" current={status} options={STATUSES.map((s) => ({ ...s, count: countOf(s.value) }))} />
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
          {rows.length === 0 && <EmptyRow cols={5}>ไม่มีรายการในสถานะนี้</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/mor-du`} params={{ status }} />
    </AdminShell>
  );
}

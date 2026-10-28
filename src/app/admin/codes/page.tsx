import { and, count, desc, eq, gt, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { activeFilters, cleanText, escapeLike, pickOne } from "@/lib/admin-filters";
import { FilterBar } from "@/components/admin/filter-bar";
import { requireAdminPage } from "@/lib/admin";
import { getDb } from "@/db";
import { coinCodes } from "@/db/schema";
import { adminBase } from "@/lib/admin-path";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, Panel, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { CodeForm } from "./code-form";
import { CodeToggle } from "./code-toggle";
import { AdminShell } from "../shell";

// ตรวจหมดอายุนอกตัว component (เรียก Date.now ตอน render ตรงๆ ไม่ได้ตามกฎ purity ของ React)
function isExpired(d: Date | null): boolean {
  return !!d && d.getTime() < Date.now();
}

const STATES = ["active", "off", "expired", "used"] as const;

export default async function AdminCodesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; state?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const q = cleanText(sp.q);
  const state = pickOne(sp.state, STATES);
  const now = sql`now()`;
  const live = and(eq(coinCodes.active, true), or(isNull(coinCodes.expiresAt), gt(coinCodes.expiresAt, now)));
  const where = and(
    q ? ilike(coinCodes.code, `%${escapeLike(q)}%`) : undefined,
    state === "off" ? eq(coinCodes.active, false) : undefined,
    state === "expired" ? and(eq(coinCodes.active, true), lte(coinCodes.expiresAt, now)) : undefined,
    state === "used" ? and(eq(coinCodes.active, true), or(isNull(coinCodes.expiresAt), gt(coinCodes.expiresAt, now)), sql`${coinCodes.usedCount} >= ${coinCodes.maxUses}`) : undefined,
    state === "active" ? and(live, sql`${coinCodes.usedCount} < ${coinCodes.maxUses}`) : undefined
  );
  const filters = activeFilters({ q, state });

  const db = getDb();
  const [[{ n: total }], rows] = await Promise.all([
    db.select({ n: count() }).from(coinCodes).where(where),
    db.select().from(coinCodes).where(where).orderBy(desc(coinCodes.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  ]);

  return (
    <AdminShell title="โค้ดแลก coin" description="สร้างโค้ดแจก coin เปิด/ปิดโค้ด และดูจำนวนที่ถูกใช้">
      <Panel title="สร้างโค้ดใหม่" className="mb-6 max-w-2xl">
        <div className="p-4">
          <CodeForm />
        </div>
      </Panel>
      <FilterBar
        path={`${base}/codes`}
        values={filters}
        fields={[
          { name: "q", label: "ค้นหาโค้ด", type: "text", placeholder: "ส่วนหนึ่งของโค้ด" },
          {
            name: "state",
            label: "สถานะ",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "active", label: "ใช้งานได้" },
              { value: "off", label: "ปิดอยู่" },
              { value: "expired", label: "หมดอายุ" },
              { value: "used", label: "ใช้ครบแล้ว" },
            ],
          },
        ]}
      />
      <DataTable>
        <thead>
          <tr>
            <Th>โค้ด</Th>
            <Th className="text-right">coin</Th>
            <Th className="text-right">ใช้แล้ว</Th>
            <Th>หมดอายุ</Th>
            <Th>สถานะ</Th>
            <Th className="text-right">จัดการ</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const expired = isExpired(c.expiresAt);
            const used = c.usedCount >= c.maxUses;
            return (
              <Tr key={c.code} muted={!c.active}>
                <Td className="font-mono text-base">{c.code}</Td>
                <Td className="text-right">{c.coins.toLocaleString("th-TH")}</Td>
                <Td className="text-right">
                  {c.usedCount}/{c.maxUses}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">{c.expiresAt ? fmtDate(c.expiresAt) : "ไม่หมดอายุ"}</Td>
                <Td>
                  {!c.active ? <StatusBadge>ปิดอยู่</StatusBadge> : expired ? <StatusBadge tone="danger">หมดอายุ</StatusBadge> : used ? <StatusBadge tone="warning">ใช้ครบแล้ว</StatusBadge> : <StatusBadge tone="success">ใช้งานได้</StatusBadge>}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end">
                    <CodeToggle code={c.code} active={c.active} />
                  </div>
                </Td>
              </Tr>
            );
          })}
          {rows.length === 0 && <EmptyRow cols={6}>{Object.keys(filters).length ? "ไม่พบรายการตามตัวกรอง" : "ยังไม่มีโค้ด"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/codes`} params={filters} />
    </AdminShell>
  );
}

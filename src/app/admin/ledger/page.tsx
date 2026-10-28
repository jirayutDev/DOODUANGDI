import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lt, sql, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { activeFilters, cleanText, escapeLike, pickOne, thaiDayEndExclusive, thaiDayStart } from "@/lib/admin-filters";
import { getDb } from "@/db";
import { coinTransactions } from "@/db/schema";
import { describeTransaction, FEATURE_COSTS } from "@/lib/coin-config";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminShell } from "../shell";

const KINDS = [
  { value: "topup", label: "เติมเงิน (topup)" },
  { value: "spend", label: "ใช้บริการ (spend)" },
  { value: "refund", label: "คืน (refund)" },
  { value: "bonus", label: "โบนัส (bonus)" },
  { value: "code", label: "แลกโค้ด (code)" },
  { value: "admin", label: "แอดมินปรับ (admin)" },
] as const;
const KIND_VALUES = KINDS.map((k) => k.value);
const SERVICES = [...(Object.keys(FEATURE_COSTS) as (keyof typeof FEATURE_COSTS)[]), "booking"] as const;
const DIRECTIONS = ["in", "out"] as const;

type SP = { page?: string; q?: string; kind?: string; service?: string; direction?: string; from?: string; to?: string };

export default async function AdminLedgerPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const q = cleanText(sp.q);
  const kind = pickOne(sp.kind, KIND_VALUES);
  const service = pickOne(sp.service, SERVICES);
  const direction = pickOne(sp.direction, DIRECTIONS);
  const fromDay = thaiDayStart(sp.from) ? sp.from : undefined;
  const toDay = thaiDayStart(sp.to) ? sp.to : undefined;
  const filters = activeFilters({ q, kind, service, direction, from: fromDay, to: toDay });

  const conds: (SQL | undefined)[] = [];
  if (q) conds.push(ilike(sql`${coinTransactions.userId}::text`, `${escapeLike(q)}%`));
  if (kind) conds.push(eq(coinTransactions.kind, kind));
  if (service === "booking") conds.push(ilike(coinTransactions.ref, "booking:%"));
  else if (service) conds.push(eq(coinTransactions.ref, service));
  if (direction === "in") conds.push(sql`${coinTransactions.amount} > 0`);
  if (direction === "out") conds.push(sql`${coinTransactions.amount} < 0`);
  const from = thaiDayStart(fromDay);
  const to = thaiDayEndExclusive(toDay);
  if (from) conds.push(gte(coinTransactions.createdAt, from));
  if (to) conds.push(lt(coinTransactions.createdAt, to));
  const where = and(...conds);

  const db = getDb();
  const [[{ n: total }], rows, [sum]] = await Promise.all([
    db.select({ n: count() }).from(coinTransactions).where(where),
    db.select().from(coinTransactions).where(where).orderBy(desc(coinTransactions.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db
      .select({
        inn: sql<number>`coalesce(sum(case when ${coinTransactions.amount} > 0 then ${coinTransactions.amount} else 0 end), 0)::int`,
        out: sql<number>`coalesce(sum(case when ${coinTransactions.amount} < 0 then -${coinTransactions.amount} else 0 end), 0)::int`,
      })
      .from(coinTransactions)
      .where(where),
  ]);
  const filtered = Object.keys(filters).length > 0;
  const th = (n: number) => n.toLocaleString("th-TH");

  return (
    <AdminShell title="ความเคลื่อนไหว coin" description="ประวัติเติม ใช้ คืน และปรับ coin ของทุกผู้ใช้ เรียงจากใหม่ไปเก่า">
      <FilterBar
        path={`${base}/ledger`}
        values={{ q, kind, service, direction, from: fromDay, to: toDay }}
        fields={[
          { name: "q", label: "ผู้ใช้", type: "text", placeholder: "รหัสผู้ใช้ขึ้นต้นด้วย" },
          { name: "kind", label: "ชนิดรายการ", type: "select", options: [{ value: "", label: "ทั้งหมด" }, ...KINDS] },
          {
            name: "service",
            label: "บริการ",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              ...SERVICES.map((s) => ({ value: s, label: s === "booking" ? "จองคิวหมอดู" : FEATURE_COSTS[s].label })),
            ],
          },
          {
            name: "direction",
            label: "ทิศทาง",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "in", label: "เข้า (+)" },
              { value: "out", label: "ออก (−)" },
            ],
          },
          { name: "from", label: "ตั้งแต่วันที่", type: "date" },
          { name: "to", label: "ถึงวันที่", type: "date" },
        ]}
      />
      <p className="mb-3 text-sm text-muted-foreground">
        {filtered ? "ตามตัวกรอง" : "ทั้งหมด"} {th(total)} รายการ · เข้า <span className="font-semibold text-primary">+{th(sum?.inn ?? 0)}</span> · ออก{" "}
        <span className="font-semibold text-soft-text">−{th(sum?.out ?? 0)}</span> coin
      </p>
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
          {rows.length === 0 && <EmptyRow cols={5}>{filtered ? "ไม่พบรายการตามตัวกรอง" : "ยังไม่มีรายการ"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/ledger`} params={filters} />
    </AdminShell>
  );
}

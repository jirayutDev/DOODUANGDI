import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { activeFilters, cleanText, escapeLike, pickOne, thaiDayEndExclusive, thaiDayStart } from "@/lib/admin-filters";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaymentActions } from "./payment-actions";
import { AdminShell, FilterTabs } from "../shell";

const STATUSES = [
  { value: "pending", label: "รอชำระ", tone: "neutral" },
  { value: "awaiting_confirmation", label: "รอแอดมินตรวจ", tone: "warning" },
  { value: "confirmed", label: "สำเร็จ", tone: "success" },
  { value: "rejected", label: "ปฏิเสธ/ยกเลิก", tone: "danger" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

const PURPOSES = ["coin", "legacy"] as const;
const AMOUNTS = ["lte50", "mid", "gt200"] as const;

type SP = { status?: string; page?: string; q?: string; purpose?: string; from?: string; to?: string; amount?: string };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status: Status = STATUSES.find((s) => s.value === sp.status)?.value ?? "awaiting_confirmation";
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const q = cleanText(sp.q);
  const purpose = pickOne(sp.purpose, PURPOSES);
  const amount = pickOne(sp.amount, AMOUNTS);
  const fromDay = thaiDayStart(sp.from) ? sp.from : undefined;
  const toDay = thaiDayStart(sp.to) ? sp.to : undefined;
  const filters = activeFilters({ q, purpose, amount, from: fromDay, to: toDay });

  const conds: (SQL | undefined)[] = [];
  if (q) conds.push(or(ilike(payments.promptpayRef, `%${escapeLike(q)}%`), ilike(sql`${payments.userId}::text`, `${escapeLike(q)}%`)));
  if (purpose === "coin") conds.push(eq(payments.purpose, "coin_topup"));
  if (purpose === "legacy") conds.push(sql`${payments.purpose} <> 'coin_topup'`);
  if (amount === "lte50") conds.push(sql`${payments.amountBaht} <= 50`);
  if (amount === "mid") conds.push(sql`${payments.amountBaht} between 51 and 200`);
  if (amount === "gt200") conds.push(sql`${payments.amountBaht} > 200`);
  const from = thaiDayStart(fromDay);
  const to = thaiDayEndExclusive(toDay);
  if (from) conds.push(gte(payments.createdAt, from));
  if (to) conds.push(lt(payments.createdAt, to));
  const filterWhere = and(...conds);

  const db = getDb();
  const [[{ n: total }], rows, counts] = await Promise.all([
    db.select({ n: count() }).from(payments).where(and(eq(payments.status, status), filterWhere)),
    db
      .select()
      .from(payments)
      .where(and(eq(payments.status, status), filterWhere))
      .orderBy(desc(payments.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ status: payments.status, n: count() }).from(payments).groupBy(payments.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const actionable = status === "pending" || status === "awaiting_confirmation";
  const tone = STATUSES.find((s) => s.value === status)!;
  const filtered = Object.keys(filters).length > 0;

  return (
    <AdminShell title="การชำระเงิน" description="รายการเติม coin ผ่าน PromptPay (ยืนยันอัตโนมัติเมื่อ Payso แจ้งว่าจ่ายแล้ว)">
      <FilterTabs
        base={`${base}/payments`}
        param="status"
        current={status}
        options={STATUSES.map((s) => ({ value: s.value, label: s.label, count: countOf(s.value) }))}
      />
      <FilterBar
        path={`${base}/payments`}
        keep={{ status }}
        values={{ q, purpose, amount, from: fromDay, to: toDay }}
        fields={[
          { name: "q", label: "ค้นหา", type: "text", placeholder: "เลขอ้างอิง หรือรหัสผู้ใช้ขึ้นต้นด้วย", wide: true },
          {
            name: "purpose",
            label: "ประเภท",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "coin", label: "เติม coin" },
              { value: "legacy", label: "รายการเก่า (สมาชิก)" },
            ],
          },
          {
            name: "amount",
            label: "ยอดเงิน",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "lte50", label: "ไม่เกิน 50 บาท" },
              { value: "mid", label: "51–200 บาท" },
              { value: "gt200", label: "มากกว่า 200 บาท" },
            ],
          },
          { name: "from", label: "ตั้งแต่วันที่", type: "date" },
          { name: "to", label: "ถึงวันที่", type: "date" },
        ]}
      />
      <DataTable>
        <thead>
          <tr>
            <Th>เวลาสร้าง</Th>
            <Th>เลขอ้างอิง</Th>
            <Th>ผู้ใช้</Th>
            <Th className="text-right">coin</Th>
            <Th className="text-right">ยอด (บาท)</Th>
            <Th>สถานะ</Th>
            {actionable && <Th className="text-right">จัดการ</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Tr key={p.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(p.createdAt)}</Td>
              <Td className="font-mono text-xs">{p.promptpayRef}</Td>
              <Td>
                <Link href={`${base}/users/${p.userId}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                  {p.userId.slice(0, 8)}
                </Link>
              </Td>
              <Td className="text-right">{p.purpose === "coin_topup" ? (p.coins ?? 0).toLocaleString("th-TH") : "-"}</Td>
              <Td className="text-right font-semibold">{p.amountBaht.toLocaleString("th-TH")}</Td>
              <Td>
                <StatusBadge tone={tone.tone}>{tone.label}</StatusBadge>
              </Td>
              {actionable && (
                <Td className="text-right">
                  <div className="flex justify-end">
                    <PaymentActions paymentId={p.id} />
                  </div>
                </Td>
              )}
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={actionable ? 7 : 6}>{filtered ? "ไม่พบรายการตามตัวกรอง" : "ไม่มีรายการในสถานะนี้"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/payments`} params={{ status, ...filters }} />
      {status === "pending" && (
        <p className="mt-3 text-xs text-muted-foreground">
          รายการรอชำระจะยืนยันเองเมื่อ Payso แจ้งว่าจ่ายแล้ว กดยืนยันมือเฉพาะเมื่อตรวจในระบบ Payso แล้วว่าเงินเข้าจริงแต่ระบบไม่เติมให้
        </p>
      )}
    </AdminShell>
  );
}

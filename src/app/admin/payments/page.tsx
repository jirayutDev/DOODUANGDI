import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { PaymentActions } from "./payment-actions";
import { AdminShell, FilterTabs } from "../shell";

const STATUSES = [
  { value: "pending", label: "รอชำระ", tone: "neutral" },
  { value: "awaiting_confirmation", label: "รอแอดมินตรวจ", tone: "warning" },
  { value: "confirmed", label: "สำเร็จ", tone: "success" },
  { value: "rejected", label: "ปฏิเสธ/ยกเลิก", tone: "danger" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status: Status = STATUSES.find((s) => s.value === sp.status)?.value ?? "awaiting_confirmation";
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  const db = getDb();
  const [[{ n: total }], rows, counts] = await Promise.all([
    db.select({ n: count() }).from(payments).where(eq(payments.status, status)),
    db.select().from(payments).where(eq(payments.status, status)).orderBy(desc(payments.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ status: payments.status, n: count() }).from(payments).groupBy(payments.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const actionable = status === "pending" || status === "awaiting_confirmation";
  const tone = STATUSES.find((s) => s.value === status)!;

  return (
    <AdminShell title="การชำระเงิน" description="รายการเติม coin ผ่าน PromptPay (ยืนยันอัตโนมัติเมื่อ Payso แจ้งว่าจ่ายแล้ว)">
      <FilterTabs
        base={`${base}/payments`}
        param="status"
        current={status}
        options={STATUSES.map((s) => ({ value: s.value, label: s.label, count: countOf(s.value) }))}
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
          {rows.length === 0 && <EmptyRow cols={actionable ? 7 : 6}>ไม่มีรายการในสถานะนี้</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/payments`} params={{ status }} />
      {status === "pending" && (
        <p className="mt-3 text-xs text-muted-foreground">
          รายการรอชำระจะยืนยันเองเมื่อ Payso แจ้งว่าจ่ายแล้ว กดยืนยันมือเฉพาะเมื่อตรวจในระบบ Payso แล้วว่าเงินเข้าจริงแต่ระบบไม่เติมให้
        </p>
      )}
    </AdminShell>
  );
}

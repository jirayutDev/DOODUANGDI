import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinTransactions, coinWallets, payments, profiles } from "@/db/schema";
import { describeTransaction } from "@/lib/coin-config";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, Panel, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../../shell";
import { AdjustForm } from "./adjust-form";

const PAY_STATUS = {
  pending: { label: "รอชำระ", tone: "neutral" },
  awaiting_confirmation: { label: "รอตรวจ", tone: "warning" },
  confirmed: { label: "สำเร็จ", tone: "success" },
  rejected: { label: "ยกเลิก", tone: "danger" },
} as const;

export default async function AdminUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const page = parsePage((await searchParams).page);
  const base = adminBase() === "/" ? "" : adminBase();

  const db = getDb();
  const [[profile], [wallet], [{ n: ledgerTotal }], ledger, pays] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, id.data)).limit(1),
    db.select().from(coinWallets).where(eq(coinWallets.userId, id.data)).limit(1),
    db.select({ n: count() }).from(coinTransactions).where(eq(coinTransactions.userId, id.data)),
    db.select().from(coinTransactions).where(eq(coinTransactions.userId, id.data)).orderBy(desc(coinTransactions.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select().from(payments).where(eq(payments.userId, id.data)).orderBy(desc(payments.createdAt)).limit(10),
  ]);

  return (
    <AdminShell
      title={profile?.fullName || "ผู้ใช้"}
      description={id.data}
      actions={
        <Link href={`${base}/users`} className="text-sm text-primary hover:underline">
          ← กลับรายชื่อผู้ใช้
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Panel className="p-5">
          <p className="text-sm text-muted-foreground">coin คงเหลือ</p>
          <p className="text-[44px] leading-none font-bold text-primary">{(wallet?.balance ?? 0).toLocaleString("th-TH")}</p>
          {profile && (
            <dl className="mt-4 space-y-1 text-sm text-soft-text">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">วันเกิด</dt>
                <dd>{profile.birthDate}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">ราศี</dt>
                <dd>{profile.zodiacSign ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">สมัครเมื่อ</dt>
                <dd>{fmtDate(profile.createdAt)}</dd>
              </div>
            </dl>
          )}
        </Panel>
        <AdjustForm userId={id.data} />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-bold">ประวัติ coin</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>เวลา</Th>
            <Th>รายการ</Th>
            <Th>หมายเหตุ</Th>
            <Th className="text-right">coin</Th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((h) => (
            <Tr key={h.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(h.createdAt)}</Td>
              <Td>{describeTransaction(h)}</Td>
              <Td className="text-muted-foreground">{h.kind === "admin" ? (h.ref ?? "-") : "-"}</Td>
              <Td className={`text-right font-semibold ${h.amount > 0 ? "text-primary" : "text-soft-text"}`}>{h.amount > 0 ? `+${h.amount}` : h.amount}</Td>
            </Tr>
          ))}
          {ledger.length === 0 && <EmptyRow cols={4}>ยังไม่มีรายการ</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={ledgerTotal} path={`${base}/users/${id.data}`} />

      <h2 className="mt-8 mb-2 text-lg font-bold">การชำระเงินล่าสุด</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>เวลา</Th>
            <Th>เลขอ้างอิง</Th>
            <Th className="text-right">coin</Th>
            <Th className="text-right">ยอด (บาท)</Th>
            <Th>สถานะ</Th>
          </tr>
        </thead>
        <tbody>
          {pays.map((p) => {
            const s = PAY_STATUS[p.status];
            return (
              <Tr key={p.id}>
                <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(p.createdAt)}</Td>
                <Td className="font-mono text-xs">{p.promptpayRef}</Td>
                <Td className="text-right">{p.purpose === "coin_topup" ? (p.coins ?? 0).toLocaleString("th-TH") : "-"}</Td>
                <Td className="text-right">{p.amountBaht.toLocaleString("th-TH")}</Td>
                <Td>
                  <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                </Td>
              </Tr>
            );
          })}
          {pays.length === 0 && <EmptyRow cols={5}>ยังไม่มีรายการ</EmptyRow>}
        </tbody>
      </DataTable>
    </AdminShell>
  );
}

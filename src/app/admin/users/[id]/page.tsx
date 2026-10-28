import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminPage } from "@/lib/admin";
import { getDb } from "@/db";
import { coinTransactions, coinWallets, payments, profiles } from "@/db/schema";
import { describeTransaction } from "@/lib/coin-config";
import { AdminShell } from "../../shell";
import { AdjustForm } from "./adjust-form";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const db = getDb();
  const [[profile], [wallet], ledger, pays] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, id.data)).limit(1),
    db.select().from(coinWallets).where(eq(coinWallets.userId, id.data)).limit(1),
    db.select().from(coinTransactions).where(eq(coinTransactions.userId, id.data)).orderBy(desc(coinTransactions.createdAt)).limit(50),
    db.select().from(payments).where(eq(payments.userId, id.data)).orderBy(desc(payments.createdAt)).limit(20),
  ]);

  return (
    <AdminShell title={profile?.fullName || "ผู้ใช้"}>
      <p className="font-mono text-xs text-muted-foreground">{id.data}</p>
      {profile && (
        <p className="mt-1 text-sm text-soft-text">
          เกิด {profile.birthDate} · ราศี {profile.zodiacSign ?? "-"}
        </p>
      )}
      <p className="mt-4 text-sm text-muted-foreground">coin คงเหลือ</p>
      <p className="text-[44px] font-bold leading-none text-primary">{wallet?.balance ?? 0}</p>

      <AdjustForm userId={id.data} />

      <h2 className="mt-8 text-xl font-bold">ประวัติ coin (50 รายการล่าสุด)</h2>
      <ul className="mt-2">
        {ledger.map((h) => (
          <li key={h.id} className="flex justify-between border-b border-border py-2 text-sm">
            <span>
              {describeTransaction(h)}
              {h.kind === "admin" && h.ref ? <span className="ml-2 text-xs text-muted-foreground">({h.ref})</span> : null}
              <span className="ml-2 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString("th-TH")}</span>
            </span>
            <span className={h.amount > 0 ? "font-semibold text-primary" : "text-soft-text"}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
          </li>
        ))}
        {ledger.length === 0 && <li className="text-sm text-muted-foreground">ยังไม่มีรายการ</li>}
      </ul>

      <h2 className="mt-8 text-xl font-bold">การชำระเงิน</h2>
      <ul className="mt-2">
        {pays.map((p) => (
          <li key={p.id} className="flex justify-between border-b border-border py-2 text-sm">
            <span>
              {p.coins ?? 0} coin · {p.amountBaht} บาท
              <span className="ml-2 font-mono text-xs text-muted-foreground">{p.promptpayRef}</span>
              <span className="ml-2 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString("th-TH")}</span>
            </span>
            <span className="text-soft-text">{p.status}</span>
          </li>
        ))}
        {pays.length === 0 && <li className="text-sm text-muted-foreground">ยังไม่มีรายการ</li>}
      </ul>
    </AdminShell>
  );
}

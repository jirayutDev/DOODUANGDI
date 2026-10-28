import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinTransactions } from "@/db/schema";
import { describeTransaction } from "@/lib/coin-config";
import { AdminShell } from "../shell";

export default async function AdminLedgerPage() {
  await requireAdminPage();
  const rows = await getDb().select().from(coinTransactions).orderBy(desc(coinTransactions.createdAt)).limit(200);

  return (
    <AdminShell title="ความเคลื่อนไหว coin ทั้งระบบ">
      <ul>
        {rows.map((h) => (
          <li key={h.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
            <span>
              {describeTransaction(h)}
              <Link href={`${adminBase()}/users/${h.userId}`} className="ml-2 font-mono text-xs text-muted-foreground hover:text-primary">
                {h.userId.slice(0, 8)}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString("th-TH")}</span>
            </span>
            <span className={h.amount > 0 ? "font-semibold text-primary" : "text-soft-text"}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">ยังไม่มีรายการ</li>}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">แสดง 200 รายการล่าสุด</p>
    </AdminShell>
  );
}

import Link from "next/link";
import { count, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinCodes, coinWallets, morDus, payments } from "@/db/schema";
import { LogoutButton } from "./logout-button";

async function loadStats() {
  try {
    const db = getDb();
    const [[awaiting], [mor], [codes], [rev], [wallets]] = await Promise.all([
      db.select({ n: count() }).from(payments).where(eq(payments.status, "awaiting_confirmation")),
      db.select({ n: count() }).from(morDus).where(eq(morDus.status, "pending")),
      db.select({ n: count() }).from(coinCodes).where(eq(coinCodes.active, true)),
      db
        .select({ baht: sql<number>`coalesce(sum(${payments.amountBaht}), 0)::int` })
        .from(payments)
        .where(eq(payments.status, "confirmed")),
      db.select({ n: count(), coins: sql<number>`coalesce(sum(${coinWallets.balance}), 0)::int` }).from(coinWallets),
    ]);
    return { awaiting: awaiting.n, mor: mor.n, codes: codes.n, revenue: rev.baht, wallets: wallets.n, coins: wallets.coins };
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  await requireAdminPage();
  const base = adminBase();
  const stats = await loadStats();

  const items = [
    { href: `${base}/payments`, title: "การชำระเงิน", desc: "ดูทุกสถานะ ยืนยัน/ปฏิเสธรายการเติม coin", badge: stats?.awaiting },
    { href: `${base}/pricing`, title: "ตั้งราคา", desc: "แก้ราคาแพ็กเกจเติม coin และ coin ที่แต่ละบริการใช้", badge: undefined },
    { href: `${base}/users`, title: "ผู้ใช้และ coin", desc: "ค้นหาผู้ใช้ ดูประวัติ เพิ่ม/หัก coin", badge: undefined },
    { href: `${base}/codes`, title: "โค้ดแลก coin", desc: "สร้างโค้ดแจก coin เปิด/ปิดโค้ด", badge: undefined },
    { href: `${base}/ledger`, title: "ความเคลื่อนไหว coin", desc: "ประวัติเติม/ใช้/คืน coin ทั้งระบบ", badge: undefined },
    { href: `${base}/mor-du`, title: "หมอดู", desc: "อนุมัติ ปฏิเสธ หรือพักใช้งานหมอดู", badge: stats?.mor },
    { href: `${base}/horoscopes`, title: "ดวงที่สร้างล่วงหน้า", desc: "ดูสถานะรายวัน/สัปดาห์/เดือน เติมหรือสร้างใหม่", badge: undefined },
  ];

  return (
    <div className="px-[18px] pb-10 pt-4 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-foreground">แอดมิน</h1>
        <LogoutButton />
      </div>

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "รายได้สะสม", value: `${stats.revenue.toLocaleString("th-TH")} บาท` },
            { label: "กระเป๋า coin", value: `${stats.wallets.toLocaleString("th-TH")} ใบ` },
            { label: "coin ค้างในระบบ", value: stats.coins.toLocaleString("th-TH") },
            { label: "โค้ดที่เปิดอยู่", value: String(stats.codes) },
          ].map((s) => (
            <div key={s.label} className="rounded-[14px] bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <Card className="h-full bg-card transition-colors hover:border-primary/50">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="font-display text-lg">{it.title}</CardTitle>
                {it.badge ? <Badge>{it.badge} รอดำเนินการ</Badge> : null}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{it.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

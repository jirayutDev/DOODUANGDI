import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinWallets, profiles } from "@/db/schema";
import { AdminShell } from "../shell";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);

  // ค้นจากชื่อ หรือรหัสผู้ใช้ (UUID ขึ้นต้นด้วย) — อีเมลอยู่ใน Supabase Auth ค้นจากที่นี่ไม่ได้
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await getDb()
    .select({
      userId: profiles.id,
      name: profiles.fullName,
      sign: profiles.zodiacSign,
      balance: coinWallets.balance,
    })
    .from(profiles)
    .leftJoin(coinWallets, sql`${coinWallets.userId} = ${profiles.id}`)
    .where(q ? or(ilike(profiles.fullName, pattern), sql`${profiles.id}::text ilike ${q.replace(/[%_\\]/g, "") + "%"}`) : undefined)
    .orderBy(desc(profiles.createdAt))
    .limit(100);

  return (
    <AdminShell title="ผู้ใช้และ coin">
      <form className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อ หรือรหัสผู้ใช้"
          aria-label="ค้นหาผู้ใช้"
          className="h-11 min-w-0 flex-1 rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40"
        />
        <button type="submit" className="h-11 rounded-xl bg-primary px-5 font-semibold text-ink">
          ค้นหา
        </button>
      </form>
      <ul>
        {rows.map((u) => (
          <li key={u.userId} className="border-b border-border">
            <Link href={`${adminBase()}/users/${u.userId}`} className="flex items-center justify-between py-3 text-sm hover:text-primary">
              <span>
                <span className="text-base text-foreground">{u.name || "(ไม่มีชื่อ)"}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{u.userId.slice(0, 8)}</span>
                {u.sign ? <span className="ml-2 text-xs text-muted-foreground">{u.sign}</span> : null}
              </span>
              <span className="font-semibold text-primary">{u.balance ?? 0} coin</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">ไม่พบผู้ใช้</li>}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">แสดงสูงสุด 100 รายการ ผู้ใช้ที่ยังไม่กรอกข้อมูลโปรไฟล์จะยังไม่ขึ้นที่นี่</p>
    </AdminShell>
  );
}

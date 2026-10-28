import Link from "next/link";
import { count, desc, ilike, or, sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinWallets, profiles } from "@/db/schema";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../shell";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();

  // ค้นจากชื่อ หรือรหัสผู้ใช้ (UUID ขึ้นต้นด้วย) — อีเมลอยู่ใน Supabase Auth ค้นจากที่นี่ไม่ได้
  const likeName = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const where = q ? or(ilike(profiles.fullName, likeName), sql`${profiles.id}::text ilike ${q.replace(/[%_\\]/g, "") + "%"}`) : undefined;

  const db = getDb();
  const [[{ n: total }], rows] = await Promise.all([
    db.select({ n: count() }).from(profiles).where(where),
    db
      .select({ userId: profiles.id, name: profiles.fullName, sign: profiles.zodiacSign, createdAt: profiles.createdAt, balance: coinWallets.balance })
      .from(profiles)
      .leftJoin(coinWallets, sql`${coinWallets.userId} = ${profiles.id}`)
      .where(where)
      .orderBy(desc(profiles.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  return (
    <AdminShell title="ผู้ใช้และ coin" description="ค้นหาผู้ใช้ ดูประวัติ และปรับ coin (ผู้ใช้ที่ยังไม่กรอกโปรไฟล์จะยังไม่ขึ้นที่นี่)">
      <form className="mb-4 flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อ หรือรหัสผู้ใช้"
          aria-label="ค้นหาผู้ใช้"
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40"
        />
        <button type="submit" className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground">
          ค้นหา
        </button>
      </form>
      <DataTable>
        <thead>
          <tr>
            <Th>ชื่อ</Th>
            <Th>รหัสผู้ใช้</Th>
            <Th>ราศี</Th>
            <Th>สมัครเมื่อ</Th>
            <Th className="text-right">coin</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <Tr key={u.userId}>
              <Td className="font-medium">{u.name || "(ไม่มีชื่อ)"}</Td>
              <Td className="font-mono text-xs text-muted-foreground">{u.userId.slice(0, 8)}</Td>
              <Td>{u.sign ?? "-"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(u.createdAt)}</Td>
              <Td className="text-right font-semibold text-primary">{(u.balance ?? 0).toLocaleString("th-TH")}</Td>
              <Td className="text-right">
                <Link href={`${base}/users/${u.userId}`} className="text-primary hover:underline">
                  ดู/จัดการ
                </Link>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={6}>ไม่พบผู้ใช้</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/users`} params={{ q }} />
    </AdminShell>
  );
}

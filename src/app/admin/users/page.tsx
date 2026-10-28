import Link from "next/link";
import { and, asc, count, desc, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { activeFilters, cleanText, escapeLike, pickOne, thaiDayEndExclusive, thaiDayStart } from "@/lib/admin-filters";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { getDb } from "@/db";
import { coinWallets, profiles } from "@/db/schema";
import { authUsers } from "@/db/auth-users";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminShell } from "../shell";

const COINS = ["has", "none", "100"] as const;
const SORTS = ["new", "coins_desc", "coins_asc"] as const;

type SP = { q?: string; page?: string; sign?: string; coins?: string; from?: string; to?: string; sort?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = cleanText(sp.q);
  const sign = pickOne(sp.sign, ZODIAC_SIGN_NAMES);
  const coins = pickOne(sp.coins, COINS);
  const sort = pickOne(sp.sort, SORTS);
  const fromDay = thaiDayStart(sp.from) ? sp.from : undefined;
  const toDay = thaiDayStart(sp.to) ? sp.to : undefined;
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();
  const filters = activeFilters({ q, sign, coins, sort, from: fromDay, to: toDay });

  // รายชื่อมาจาก Supabase Auth (ทุกคนที่สมัคร) แล้วโยงโปรไฟล์และกระเป๋า coin ถ้ามี ผู้ใช้ที่ยังไม่กรอกโปรไฟล์ก็ขึ้นด้วย (ราศีเป็น "-")
  // ค้นจากชื่อ อีเมล เบอร์โทร หรือรหัสผู้ใช้ (UUID ขึ้นต้นด้วย)
  const balance = sql`coalesce(${coinWallets.balance}, 0)`;
  const displayName = sql<string | null>`coalesce(${profiles.fullName}, ${authUsers.meta}->>'full_name', ${authUsers.meta}->>'name')`;
  const conds: (SQL | undefined)[] = [sql`${authUsers.deletedAt} is null`];
  if (q) {
    const like = `%${escapeLike(q)}%`;
    conds.push(
      or(
        ilike(displayName, like),
        ilike(authUsers.email, like),
        ilike(authUsers.phone, like),
        ilike(sql`${authUsers.id}::text`, `${escapeLike(q)}%`)
      )
    );
  }
  if (sign) conds.push(sql`${profiles.zodiacSign} = ${sign}`);
  if (coins === "has") conds.push(sql`${balance} > 0`);
  if (coins === "none") conds.push(sql`${balance} = 0`);
  if (coins === "100") conds.push(sql`${balance} >= 100`);
  const from = thaiDayStart(fromDay);
  const to = thaiDayEndExclusive(toDay);
  if (from) conds.push(gte(authUsers.createdAt, from));
  if (to) conds.push(lt(authUsers.createdAt, to));
  const where = and(...conds);
  const order = sort === "coins_desc" ? [desc(balance), desc(authUsers.createdAt)] : sort === "coins_asc" ? [asc(balance), desc(authUsers.createdAt)] : [desc(authUsers.createdAt)];

  const db = getDb();
  const [[{ n: total }], rows] = await Promise.all([
    db
      .select({ n: count() })
      .from(authUsers)
      .leftJoin(profiles, sql`${profiles.id} = ${authUsers.id}`)
      .leftJoin(coinWallets, sql`${coinWallets.userId} = ${authUsers.id}`)
      .where(where),
    db
      .select({
        userId: authUsers.id,
        name: displayName,
        email: authUsers.email,
        phone: authUsers.phone,
        sign: profiles.zodiacSign,
        createdAt: authUsers.createdAt,
        lastSignInAt: authUsers.lastSignInAt,
        balance: coinWallets.balance,
      })
      .from(authUsers)
      .leftJoin(profiles, sql`${profiles.id} = ${authUsers.id}`)
      .leftJoin(coinWallets, sql`${coinWallets.userId} = ${authUsers.id}`)
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const filtered = Object.keys(filters).length > 0;

  return (
    <AdminShell title="ผู้ใช้และ coin" description="ผู้สมัครทุกคน ค้นหา ดูประวัติ และปรับ coin (คนที่ยังไม่กรอกโปรไฟล์จะไม่มีราศี)">
      <FilterBar
        path={`${base}/users`}
        values={{ q, sign, coins, sort, from: fromDay, to: toDay }}
        fields={[
          { name: "q", label: "ค้นหา", type: "text", placeholder: "ชื่อ อีเมล เบอร์โทร หรือรหัสผู้ใช้ขึ้นต้นด้วย", wide: true },
          { name: "sign", label: "ราศี", type: "select", options: [{ value: "", label: "ทุกราศี" }, ...ZODIAC_SIGN_NAMES.map((s) => ({ value: s, label: s }))] },
          {
            name: "coins",
            label: "coin คงเหลือ",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "has", label: "มี coin" },
              { value: "none", label: "ไม่มี coin" },
              { value: "100", label: "ตั้งแต่ 100" },
            ],
          },
          { name: "from", label: "สมัครตั้งแต่", type: "date" },
          { name: "to", label: "สมัครถึง", type: "date" },
          {
            name: "sort",
            label: "เรียงตาม",
            type: "select",
            options: [
              { value: "", label: "ใหม่สุด" },
              { value: "coins_desc", label: "coin มากสุด" },
              { value: "coins_asc", label: "coin น้อยสุด" },
            ],
          },
        ]}
      />
      <DataTable>
        <thead>
          <tr>
            <Th>ชื่อ</Th>
            <Th>อีเมล / เบอร์</Th>
            <Th>รหัสผู้ใช้</Th>
            <Th>ราศี</Th>
            <Th>สมัครเมื่อ</Th>
            <Th>เข้าใช้ล่าสุด</Th>
            <Th className="text-right">coin</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <Tr key={u.userId}>
              <Td className="font-medium">{u.name || "(ไม่มีชื่อ)"}</Td>
              <Td className="max-w-[16rem] truncate text-muted-foreground">{u.email || u.phone || "-"}</Td>
              <Td className="font-mono text-xs text-muted-foreground">{u.userId.slice(0, 8)}</Td>
              <Td>{u.sign ?? "-"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{u.createdAt ? fmtDate(u.createdAt) : "-"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{u.lastSignInAt ? fmtDate(u.lastSignInAt) : "-"}</Td>
              <Td className="text-right font-semibold text-primary">{(u.balance ?? 0).toLocaleString("th-TH")}</Td>
              <Td className="text-right">
                <Link href={`${base}/users/${u.userId}`} className="text-primary hover:underline">
                  ดู/จัดการ
                </Link>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={8}>{filtered ? "ไม่พบรายการตามตัวกรอง" : "ไม่พบผู้ใช้"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/users`} params={filters} />
    </AdminShell>
  );
}

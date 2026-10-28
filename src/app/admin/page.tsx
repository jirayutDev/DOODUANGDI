import Link from "next/link";
import { sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { getPricing } from "@/lib/pricing";
import { FEATURE_COSTS, describeTransaction } from "@/lib/coin-config";
import { microUsdToBaht } from "@/lib/ai-cost";
import { ColumnChart, Delta, HBarList, VIZ, compact, fillDays } from "@/components/admin/charts";
import { DataTable, EmptyRow, fmtDate, Panel, StatTile, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell, FilterTabs } from "./shell";

const PAY_STATUS = {
  pending: { label: "รอชำระ", tone: "neutral" },
  awaiting_confirmation: { label: "รอตรวจ", tone: "warning" },
  confirmed: { label: "สำเร็จ", tone: "success" },
  rejected: { label: "ยกเลิก", tone: "danger" },
} as const;

const DAY = 86_400_000;
const BKK = 7 * 3_600_000;
const RANGES = [7, 30, 90] as const;
const th = (n: number) => n.toLocaleString("th-TH");
const baht = (n: number) => `฿${th(Math.round(n))}`;
const num = (v: unknown) => Number(v ?? 0);

const SOURCE_LABEL: Record<string, string> = { topup: "เติมเงิน", bonus: "โบนัส/ต้อนรับ", code: "โค้ดแลก", refund: "คืน coin", admin: "แอดมินปรับ" };
const BOOKING_LABEL: Record<string, string> = { requested: "ขอคิว", accepted: "หมอดูรับแล้ว", paid: "ชำระแล้ว", completed: "เสร็จสิ้น", declined: "ปฏิเสธ", cancelled: "ยกเลิก" };
const BOOKING_ORDER = ["requested", "accepted", "paid", "completed", "declined", "cancelled"];
const BOOKING_CORE = new Set(["requested", "accepted", "paid", "completed"]);

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  return (await getDb().execute(query)) as unknown as T[];
}

type Pair = { cur: number; prev: number };
const pair = (r: { cur?: unknown; prev?: unknown } | undefined): Pair => ({ cur: num(r?.cur), prev: num(r?.prev) });

async function loadCore(s: string, p: string) {
  const day = (col: string) => sql.raw(`to_char(${col} at time zone 'Asia/Bangkok', 'YYYY-MM-DD')`);
  const [rev, payers, users, active, coinUsed, chats, revDaily, usersDaily, usedDaily, stock, spendByRef, packs, sources, top, funnel, bookingMoney, recentPayments, recentLedger] =
    await Promise.all([
      rows<{ cur: string; prev: string }>(sql`select coalesce(sum(amount_baht) filter (where confirmed_at >= ${s}::timestamptz),0) as cur, coalesce(sum(amount_baht) filter (where confirmed_at < ${s}::timestamptz),0) as prev from payments where purpose='coin_topup' and status='confirmed' and confirmed_at >= ${p}::timestamptz`),
      rows<{ cur: string; prev: string }>(sql`select count(distinct user_id) filter (where confirmed_at >= ${s}::timestamptz) as cur, count(distinct user_id) filter (where confirmed_at < ${s}::timestamptz) as prev from payments where purpose='coin_topup' and status='confirmed' and confirmed_at >= ${p}::timestamptz`),
      rows<{ cur: string; prev: string }>(sql`select count(*) filter (where created_at >= ${s}::timestamptz) as cur, count(*) filter (where created_at < ${s}::timestamptz) as prev from profiles where created_at >= ${p}::timestamptz`),
      rows<{ cur: string; prev: string }>(sql`select count(distinct user_id) filter (where created_at >= ${s}::timestamptz) as cur, count(distinct user_id) filter (where created_at < ${s}::timestamptz) as prev from coin_transactions where kind='spend' and created_at >= ${p}::timestamptz`),
      rows<{ cur: string; prev: string }>(sql`select coalesce(-sum(amount) filter (where created_at >= ${s}::timestamptz),0) as cur, coalesce(-sum(amount) filter (where created_at < ${s}::timestamptz),0) as prev from coin_transactions where kind in ('spend','refund') and created_at >= ${p}::timestamptz`),
      rows<{ cur: string; prev: string }>(sql`select count(*) filter (where created_at >= ${s}::timestamptz) as cur, count(*) filter (where created_at < ${s}::timestamptz) as prev from chat_messages where role='user' and created_at >= ${p}::timestamptz`),
      rows<{ d: string; v: string }>(sql`select ${day("confirmed_at")} as d, sum(amount_baht) as v from payments where purpose='coin_topup' and status='confirmed' and confirmed_at >= ${s}::timestamptz group by 1`),
      rows<{ d: string; v: string }>(sql`select ${day("created_at")} as d, count(*) as v from profiles where created_at >= ${s}::timestamptz group by 1`),
      rows<{ d: string; v: string }>(sql`select ${day("created_at")} as d, -sum(amount) as v from coin_transactions where kind in ('spend','refund') and created_at >= ${s}::timestamptz group by 1`),
      rows<{ coins: string; wallets: string; awaiting: string; mor: string; codes: string }>(sql`select (select coalesce(sum(balance),0) from coin_wallets) as coins, (select count(*) from coin_wallets) as wallets, (select count(*) from payments where status='awaiting_confirmation') as awaiting, (select count(*) from mor_dus where status='pending') as mor, (select count(*) from coin_codes where active) as codes`),
      rows<{ ref: string | null; v: string }>(sql`select ref, -sum(amount) as v from coin_transactions where kind='spend' and created_at >= ${s}::timestamptz group by ref order by v desc limit 60`),
      rows<{ coins: string; n: string; baht: string }>(sql`select coins, count(*) as n, sum(amount_baht) as baht from payments where purpose='coin_topup' and status='confirmed' and confirmed_at >= ${s}::timestamptz group by coins order by n desc limit 8`),
      rows<{ kind: string; v: string }>(sql`select kind, sum(amount) as v from coin_transactions where amount > 0 and kind in ('topup','bonus','code','refund','admin') and created_at >= ${s}::timestamptz group by kind order by v desc`),
      rows<{ user_id: string; name: string | null; v: string; n: string }>(sql`select t.user_id, p.full_name as name, -sum(t.amount) as v, count(*) as n from coin_transactions t left join profiles p on p.id = t.user_id where t.kind='spend' and t.created_at >= ${s}::timestamptz group by t.user_id, p.full_name order by v desc limit 10`),
      rows<{ status: string; n: string }>(sql`select status::text as status, count(*) as n from bookings where created_at >= ${s}::timestamptz group by 1`),
      rows<{ gmv: string; commission: string }>(sql`select coalesce(sum(price_coins) filter (where status in ('paid','completed')),0) as gmv, coalesce(sum(commission_coins) filter (where status = 'completed'),0) as commission from bookings where created_at >= ${s}::timestamptz`),
      rows<{ id: string; created_at: string; purpose: string; coins: string | null; amount_baht: number; status: keyof typeof PAY_STATUS }>(sql`select id, created_at, purpose::text as purpose, coins, amount_baht, status::text as status from payments order by created_at desc limit 8`),
      rows<{ id: string; created_at: string; user_id: string; amount: number; kind: string; ref: string | null }>(sql`select id, created_at, user_id, amount, kind, ref from coin_transactions order by created_at desc limit 8`),
    ]);
  const toMap = (list: { d: string; v: string }[]) => new Map(list.map((r) => [r.d, num(r.v)]));
  return {
    revenue: pair(rev[0]),
    payers: pair(payers[0]),
    newUsers: pair(users[0]),
    activeUsers: pair(active[0]),
    coinUsed: pair(coinUsed[0]),
    chats: pair(chats[0]),
    revDaily: toMap(revDaily),
    usersDaily: toMap(usersDaily),
    usedDaily: toMap(usedDaily),
    stock: { coins: num(stock[0]?.coins), wallets: num(stock[0]?.wallets), awaiting: num(stock[0]?.awaiting), mor: num(stock[0]?.mor), codes: num(stock[0]?.codes) },
    spendByRef,
    packs,
    sources,
    top,
    funnel,
    bookingMoney: { gmv: num(bookingMoney[0]?.gmv), commission: num(bookingMoney[0]?.commission) },
    recentPayments,
    recentLedger,
  };
}

// ต้นทุน AI แยก try/catch: ตาราง ai_usage อาจยังไม่ถูกสร้าง (ยังไม่ได้รัน drizzle-kit push) ส่วนอื่นของหน้าต้องยังแสดงได้
async function loadAiCost(s: string, p: string) {
  try {
    const [tot, daily] = await Promise.all([
      rows<{ cur: string; prev: string }>(sql`select coalesce(sum(cost_micro_usd) filter (where created_at >= ${s}::timestamptz),0) as cur, coalesce(sum(cost_micro_usd) filter (where created_at < ${s}::timestamptz),0) as prev from ai_usage where created_at >= ${p}::timestamptz`),
      rows<{ d: string; v: string }>(sql`select to_char(created_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as d, sum(cost_micro_usd) as v from ai_usage where created_at >= ${s}::timestamptz group by 1`),
    ]);
    return { ok: true as const, micro: pair(tot[0]), daily: new Map(daily.map((r) => [r.d, num(r.v)])) };
  } catch {
    return { ok: false as const };
  }
}

// เวลาปัจจุบันอ่านนอกตัว component (เรียก Date.now ตอน render ตรงๆ ไม่ได้ตามกฎ purity ของ React)
function rangeFor(days: number) {
  const nowMs = Date.now();
  const todayStart = Math.floor((nowMs + BKK) / DAY) * DAY - BKK; // เที่ยงคืนไทยวันนี้ (UTC instant)
  return {
    nowMs,
    s: new Date(todayStart - (days - 1) * DAY).toISOString(), // เริ่มช่วงปัจจุบัน
    p: new Date(todayStart - (2 * days - 1) * DAY).toISOString(), // เริ่มช่วงก่อนหน้า (ไว้เทียบ)
  };
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminPage();
  const base = adminBase() === "/" ? "" : adminBase();
  const raw = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(raw) ? raw : 30;

  const { nowMs, s, p } = rangeFor(days);

  let d: Awaited<ReturnType<typeof loadCore>> | null = null;
  let ai: Awaited<ReturnType<typeof loadAiCost>> = { ok: false };
  let usdThb = 36;
  try {
    [d, ai, usdThb] = await Promise.all([loadCore(s, p), loadAiCost(s, p), getPricing().then((x) => x.usdThb)]);
  } catch {
    d = null;
  }

  const tabs = <FilterTabs base={base || "/"} param="days" current={String(days)} options={RANGES.map((r) => ({ value: String(r), label: `${r} วัน` }))} />;

  if (!d) {
    return (
      <AdminShell title="ภาพรวม" description="สรุปรายได้ ผู้ใช้ การใช้ coin และต้นทุน">
        {tabs}
        <Panel className="p-6 text-muted-foreground">โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่อฐานข้อมูล (เปิด /api/health) หรือรัน drizzle-kit push ให้ตารางครบ</Panel>
      </AdminShell>
    );
  }

  const aiBaht = ai.ok ? { cur: microUsdToBaht(ai.micro.cur, usdThb), prev: microUsdToBaht(ai.micro.prev, usdThb) } : null;
  const profit = aiBaht ? { cur: d.revenue.cur - aiBaht.cur, prev: d.revenue.prev - aiBaht.prev } : null;
  const arppu = d.payers.cur > 0 ? d.revenue.cur / d.payers.cur : 0;
  const arppuPrev = d.payers.prev > 0 ? d.revenue.prev / d.payers.prev : 0;
  const payRate = d.activeUsers.cur > 0 ? (d.payers.cur / d.activeUsers.cur) * 100 : 0;
  const payRatePrev = d.activeUsers.prev > 0 ? (d.payers.prev / d.activeUsers.prev) * 100 : 0;

  const featureLabel = (ref: string | null) => {
    if (!ref) return "อื่นๆ";
    if (ref.startsWith("booking:")) return "คิวหมอดู";
    return (FEATURE_COSTS as Record<string, { label: string }>)[ref]?.label ?? ref;
  };
  // รวมแถวที่ label ซ้ำ (เช่น booking:<id> หลายแถวรวมเป็น "คิวหมอดู")
  const spendMap = new Map<string, number>();
  for (const r of d.spendByRef) {
    const label = featureLabel(r.ref);
    spendMap.set(label, (spendMap.get(label) ?? 0) + num(r.v));
  }
  const spendItems = [...spendMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 9);

  // ขั้นตอนหลัก 4 ขั้นแสดงเสมอ (แม้เป็น 0) ปฏิเสธ/ยกเลิกแสดงเมื่อมี
  const funnelItems = BOOKING_ORDER.map((k) => ({ key: k, label: BOOKING_LABEL[k], value: num(d.funnel.find((f) => f.status === k)?.n) }))
    .filter((x) => BOOKING_CORE.has(x.key) || x.value > 0)
    .map(({ label, value }) => ({ label, value }));

  return (
    <AdminShell title="ภาพรวม" description={`สรุป ${days} วันล่าสุด (เทียบกับ ${days} วันก่อนหน้า) เวลาไทย`}>
      {tabs}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="รายได้จากการเติม" value={baht(d.revenue.cur)} delta={<Delta current={d.revenue.cur} previous={d.revenue.prev} />} />
        <StatTile label="ผู้ใช้ใหม่" value={th(d.newUsers.cur)} delta={<Delta current={d.newUsers.cur} previous={d.newUsers.prev} />} />
        <StatTile label="ผู้ใช้ที่ใช้งาน" value={th(d.activeUsers.cur)} hint="คนที่ใช้ coin อย่างน้อย 1 ครั้ง" delta={<Delta current={d.activeUsers.cur} previous={d.activeUsers.prev} />} />
        <StatTile label="coin ที่ใช้" value={th(d.coinUsed.cur)} hint="หลังหักที่คืนแล้ว" delta={<Delta current={d.coinUsed.cur} previous={d.coinUsed.prev} />} />
        <StatTile
          label="ต้นทุน AI"
          value={aiBaht ? baht(aiBaht.cur) : "-"}
          hint={aiBaht ? undefined : "ยังไม่มีข้อมูล (รัน drizzle-kit push)"}
          delta={aiBaht ? <Delta current={aiBaht.cur} previous={aiBaht.prev} goodWhen="down" /> : undefined}
        />
        <StatTile label="กำไรโดยประมาณ" value={profit ? baht(profit.cur) : "-"} hint="รายได้เติม − ต้นทุน AI" delta={profit ? <Delta current={profit.cur} previous={profit.prev} /> : undefined} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="ผู้เติมเงิน" value={th(d.payers.cur)} hint="ผู้ใช้ที่เติมไม่ซ้ำคน" delta={<Delta current={d.payers.cur} previous={d.payers.prev} />} />
        <StatTile label="รายได้ต่อผู้เติม (ARPPU)" value={baht(arppu)} delta={<Delta current={arppu} previous={arppuPrev} />} />
        <StatTile label="อัตราผู้ใช้ที่เติมเงิน" value={`${payRate.toFixed(1)}%`} hint="ผู้เติม ÷ ผู้ใช้ที่ใช้งาน" delta={<Delta current={payRate} previous={payRatePrev} />} />
        <StatTile label="คำถามที่ถามน้องมู" value={th(d.chats.cur)} delta={<Delta current={d.chats.cur} previous={d.chats.prev} />} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="coin ค้างในระบบ" value={th(d.stock.coins)} hint={`ใน ${th(d.stock.wallets)} กระเป๋า`} />
        <StatTile label="รอตรวจชำระเงิน" value={th(d.stock.awaiting)} hint="กดยืนยันที่เมนูการชำระเงิน" />
        <StatTile label="ใบสมัครหมอดูรออนุมัติ" value={th(d.stock.mor)} />
        <StatTile label="โค้ดที่ใช้งานอยู่" value={th(d.stock.codes)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ColumnChart
          title="รายได้จากการเติมรายวัน"
          data={fillDays(days, d.revDaily, nowMs)}
          color={VIZ.gold}
          format={(n) => (n >= 1000 ? `฿${compact(n)}` : baht(n))}
          subtitle={`รวม ${baht(d.revenue.cur)}`}
        />
        <ColumnChart title="ผู้ใช้ใหม่รายวัน" data={fillDays(days, d.usersDaily, nowMs)} color={VIZ.blue} subtitle={`รวม ${th(d.newUsers.cur)} คน`} />
        <ColumnChart title="coin ที่ใช้รายวัน" data={fillDays(days, d.usedDaily, nowMs)} color={VIZ.violet} subtitle={`รวม ${th(d.coinUsed.cur)} coin`} />
        {ai.ok ? (
          <ColumnChart
            title="ต้นทุน AI รายวัน"
            data={fillDays(days, new Map([...ai.daily].map(([k, v]) => [k, microUsdToBaht(v, usdThb)])), nowMs)}
            color={VIZ.orange}
            format={(n) => `฿${n >= 100 ? th(Math.round(n)) : n.toFixed(2)}`}
            subtitle={`รวม ${baht(aiBaht?.cur ?? 0)}`}
          />
        ) : (
          <Panel className="flex items-center justify-center p-6 text-center text-sm text-muted-foreground">ต้นทุน AI: ยังไม่มีข้อมูล (รัน drizzle-kit push เพื่อสร้างตาราง ai_usage)</Panel>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HBarList title="coin ที่ใช้แยกตามบริการ" subtitle={`${days} วัน`} items={spendItems} color={VIZ.violet} format={(n) => `${th(n)} coin`} />
        <HBarList
          title="แพ็กเกจที่ขายดี"
          subtitle="จำนวนครั้งที่เติม"
          items={d.packs.map((k) => ({ label: `${th(num(k.coins))} coin`, value: num(k.n), sub: baht(num(k.baht)) }))}
          color={VIZ.gold}
          format={(n) => `${th(n)} ครั้ง`}
        />
        <HBarList
          title="ที่มาของ coin ที่ได้รับ"
          subtitle={`${days} วัน`}
          items={d.sources.map((k) => ({ label: SOURCE_LABEL[k.kind] ?? k.kind, value: num(k.v) }))}
          color={VIZ.aqua}
          format={(n) => `${th(n)} coin`}
        />
        <section>
          <h2 className="mb-2 text-base font-bold">ผู้ใช้ใช้จ่ายสูงสุด</h2>
          <DataTable className="[&_table]:min-w-0">
            <thead>
              <tr>
                <Th>ผู้ใช้</Th>
                <Th className="text-right">ครั้ง</Th>
                <Th className="text-right">coin</Th>
              </tr>
            </thead>
            <tbody>
              {d.top.map((u) => (
                <Tr key={u.user_id}>
                  <Td>
                    <Link href={`${base}/users/${u.user_id}`} className="hover:text-primary">
                      {u.name || "(ไม่มีชื่อ)"} <span className="font-mono text-xs text-muted-foreground">{u.user_id.slice(0, 8)}</span>
                    </Link>
                  </Td>
                  <Td className="text-right text-muted-foreground">{th(num(u.n))}</Td>
                  <Td className="text-right font-semibold text-primary">{th(num(u.v))}</Td>
                </Tr>
              ))}
              {d.top.length === 0 && <EmptyRow cols={3}>ยังไม่มีการใช้ coin ในช่วงนี้</EmptyRow>}
            </tbody>
          </DataTable>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <HBarList title="คิวหมอดู (ขั้นตอน)" subtitle={`คิวที่ขอใน ${days} วัน`} items={funnelItems} color={VIZ.blue} format={(n) => `${th(n)} คิว`} empty="ยังไม่มีคำขอคิวในช่วงนี้" />
        <Panel title="มูลค่าคิวหมอดู" className="p-0">
          <dl className="space-y-3 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ยอดที่ลูกค้าจ่าย (ชำระแล้ว+เสร็จสิ้น)</dt>
              <dd className="font-bold text-primary">{th(d.bookingMoney.gmv)} coin</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ค่าบริการเว็บ (คิวที่เสร็จสิ้น)</dt>
              <dd className="font-bold text-primary">{th(d.bookingMoney.commission)} coin</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">การชำระเงินล่าสุด</h2>
            <Link href={`${base}/payments`} className="text-sm text-primary hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <DataTable className="[&_table]:min-w-0">
            <thead>
              <tr>
                <Th>เวลา</Th>
                <Th>รายการ</Th>
                <Th className="text-right">ยอด</Th>
                <Th>สถานะ</Th>
              </tr>
            </thead>
            <tbody>
              {d.recentPayments.map((x) => {
                const st = PAY_STATUS[x.status];
                return (
                  <Tr key={x.id}>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(x.created_at)}</Td>
                    <Td>{x.purpose === "coin_topup" ? `เติม ${th(num(x.coins))} coin` : "รายการเก่า (สมาชิก)"}</Td>
                    <Td className="text-right">{th(x.amount_baht)} บาท</Td>
                    <Td>
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </Td>
                  </Tr>
                );
              })}
              {d.recentPayments.length === 0 && <EmptyRow cols={4}>ยังไม่มีรายการ</EmptyRow>}
            </tbody>
          </DataTable>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">ความเคลื่อนไหว coin ล่าสุด</h2>
            <Link href={`${base}/ledger`} className="text-sm text-primary hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <DataTable className="[&_table]:min-w-0">
            <thead>
              <tr>
                <Th>เวลา</Th>
                <Th>รายการ</Th>
                <Th>ผู้ใช้</Th>
                <Th className="text-right">coin</Th>
              </tr>
            </thead>
            <tbody>
              {d.recentLedger.map((h) => (
                <Tr key={h.id}>
                  <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(h.created_at)}</Td>
                  <Td>{describeTransaction({ kind: h.kind, ref: h.ref })}</Td>
                  <Td>
                    <Link href={`${base}/users/${h.user_id}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                      {h.user_id.slice(0, 8)}
                    </Link>
                  </Td>
                  <Td className={`text-right font-semibold ${h.amount > 0 ? "text-primary" : "text-soft-text"}`}>{h.amount > 0 ? `+${th(h.amount)}` : th(h.amount)}</Td>
                </Tr>
              ))}
              {d.recentLedger.length === 0 && <EmptyRow cols={4}>ยังไม่มีรายการ</EmptyRow>}
            </tbody>
          </DataTable>
        </section>
      </div>
    </AdminShell>
  );
}

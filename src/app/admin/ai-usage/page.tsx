import Link from "next/link";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { activeFilters, cleanText, escapeLike, pickOne } from "@/lib/admin-filters";
import { FilterBar } from "@/components/admin/filter-bar";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { aiUsage, coinTransactions, payments } from "@/db/schema";
import { getPricing } from "@/lib/pricing";
import { microUsdToBaht } from "@/lib/ai-cost";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, Panel, parsePage, StatTile, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { ColumnChart, Delta, HBarList, VIZ, fillDays } from "@/components/admin/charts";
import { AdminShell, FilterTabs } from "../shell";

const RANGES = [
  { value: "1", label: "วันนี้ (24 ชม.)" },
  { value: "7", label: "7 วัน" },
  { value: "30", label: "30 วัน" },
  { value: "90", label: "90 วัน" },
] as const;

const FEATURE_LABEL: Record<string, string> = {
  chat: "แชทน้องมู",
  "reading-summary": "สรุปผลไพ่",
  "topic-reading": "ดูดวงเฉพาะเรื่อง",
  "face-reading": "โหงวเฮ้ง",
  "love-match": "จับคู่ความรัก",
  horoscope: "ดวงล่วงหน้า (ระบบ)",
};

const num = (n: number) => n.toLocaleString("th-TH");

// บาทแบบละเอียดพอสำหรับค่าเล็กๆ: ต่ำกว่า 1 บาทแสดง 4 ตำแหน่ง ต่ำกว่า 100 แสดง 2 ตำแหน่ง
function baht(n: number): string {
  const abs = Math.abs(n);
  const digits = abs < 1 ? 4 : abs < 100 ? 2 : 0;
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

type LogFilters = { feature?: string; model?: string; result?: "ok" | "fail"; user?: string; unknown?: "1" };

async function load(days: number, page: number, f: LogFilters) {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 3_600_000);
  const inRange = gte(aiUsage.createdAt, since);
  // ตัวกรองเฉพาะตารางรายการเรียก (กราฟและตัวเลขสรุปด้านบนยังนับทั้งช่วง)
  const logWhere = and(
    inRange,
    f.feature ? eq(aiUsage.feature, f.feature) : undefined,
    f.model ? eq(aiUsage.model, f.model) : undefined,
    f.result === "ok" ? eq(aiUsage.ok, true) : f.result === "fail" ? eq(aiUsage.ok, false) : undefined,
    f.user ? sql`${aiUsage.userId}::text ilike ${`${escapeLike(f.user)}%`}` : undefined,
    f.unknown ? and(eq(aiUsage.ok, true), isNull(aiUsage.costMicroUsd)) : undefined
  );
  // ช่วงก่อนหน้าที่ยาวเท่ากัน ไว้เทียบส่วนต่าง
  const prevSince = new Date(since.getTime() - days * 24 * 3_600_000);
  const prevRange = and(gte(aiUsage.createdAt, prevSince), lt(aiUsage.createdAt, since));
  const micro = sql<number>`coalesce(sum(${aiUsage.costMicroUsd}), 0)::bigint`;
  const tokens = sql<number>`coalesce(sum(${aiUsage.promptTokens} + ${aiUsage.completionTokens}), 0)::bigint`;

  const [[totals], byFeature, byModel, byDay, [{ n: logTotal }], log, spends, [topup], daily, [prev], [extra]] = await Promise.all([
    db
      .select({
        calls: count(),
        ok: sql<number>`count(*) filter (where ${aiUsage.ok})::int`,
        failed: sql<number>`count(*) filter (where not ${aiUsage.ok})::int`,
        unknown: sql<number>`count(*) filter (where ${aiUsage.ok} and ${aiUsage.costMicroUsd} is null)::int`,
        tin: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)::bigint`,
        tout: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)::bigint`,
        micro,
      })
      .from(aiUsage)
      .where(inRange),
    db
      .select({
        feature: aiUsage.feature,
        calls: count(),
        tin: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)::bigint`,
        tout: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)::bigint`,
        micro,
      })
      .from(aiUsage)
      .where(inRange)
      .groupBy(aiUsage.feature)
      .orderBy(desc(micro)),
    db
      .select({
        model: aiUsage.model,
        provider: aiUsage.provider,
        calls: count(),
        tin: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)::bigint`,
        tout: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)::bigint`,
        micro,
      })
      .from(aiUsage)
      .where(inRange)
      .groupBy(aiUsage.model, aiUsage.provider)
      .orderBy(desc(micro)),
    db
      .select({
        day: sql<string>`to_char(${aiUsage.createdAt} at time zone 'Asia/Bangkok', 'YYYY-MM-DD')`,
        calls: count(),
        micro,
      })
      .from(aiUsage)
      .where(inRange)
      .groupBy(sql`1`)
      .orderBy(desc(sql`1`))
      .limit(Math.min(days, 14)),
    db.select({ n: count() }).from(aiUsage).where(logWhere),
    db.select().from(aiUsage).where(logWhere).orderBy(desc(aiUsage.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    // coin ที่ลูกค้าจ่ายต่อฟีเจอร์ สุทธิหลังหักที่คืน (spend เป็นลบ refund เป็นบวก ref = ชื่อฟีเจอร์)
    db
      .select({ feature: coinTransactions.ref, coins: sql<number>`coalesce(-sum(${coinTransactions.amount}), 0)::int` })
      .from(coinTransactions)
      .where(and(gte(coinTransactions.createdAt, since), sql`${coinTransactions.kind} in ('spend', 'refund')`))
      .groupBy(coinTransactions.ref),
    // ราคาขายเฉลี่ยต่อ 1 coin จากการเติมจริงที่ยืนยันแล้ว (ไม่นับโบนัส)
    db
      .select({
        baht: sql<number>`coalesce(sum(${payments.amountBaht}), 0)::int`,
        coins: sql<number>`coalesce(sum(${payments.coins}), 0)::int`,
      })
      .from(payments)
      .where(and(eq(payments.purpose, "coin_topup"), eq(payments.status, "confirmed"))),
    // รายวันตลอดช่วง (ใช้วาดกราฟ) ตามวันเวลาไทย
    db
      .select({
        day: sql<string>`to_char(${aiUsage.createdAt} at time zone 'Asia/Bangkok', 'YYYY-MM-DD')`,
        calls: count(),
        tokens,
        micro,
      })
      .from(aiUsage)
      .where(inRange)
      .groupBy(sql`1`),
    // ช่วงก่อนหน้า
    db.select({ calls: count(), tokens, micro }).from(aiUsage).where(prevRange),
    // ตัวเลขเสริม: ผู้ใช้ที่ใช้งาน, เวลาเฉลี่ยของครั้งที่สำเร็จ, ต้นทุนที่ผูกกับผู้ใช้ (ไม่นับงานของระบบเช่นดวงล่วงหน้า)
    db
      .select({
        users: sql<number>`count(distinct ${aiUsage.userId})::int`,
        avgMs: sql<number>`coalesce(avg(${aiUsage.ms}) filter (where ${aiUsage.ok}), 0)::int`,
        userMicro: sql<number>`coalesce(sum(${aiUsage.costMicroUsd}) filter (where ${aiUsage.userId} is not null), 0)::bigint`,
      })
      .from(aiUsage)
      .where(inRange),
  ]);

  const bahtPerCoin = topup.coins > 0 ? topup.baht / topup.coins : 0.9;
  return { totals, byFeature, byModel, byDay, logTotal, log, spends, bahtPerCoin, topupKnown: topup.coins > 0, daily, prev, extra };
}

export default async function AdminAiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; page?: string; feature?: string; model?: string; result?: string; user?: string; unknown?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const range = RANGES.find((r) => r.value === sp.days)?.value ?? "7";
  const days = Number(range);
  const page = parsePage(sp.page);
  const base = adminBase() === "/" ? "" : adminBase();
  const { usdThb } = await getPricing();

  const logFilters: LogFilters = {
    feature: pickOne(sp.feature, Object.keys(FEATURE_LABEL)),
    model: cleanText(sp.model, 120) || undefined,
    result: pickOne(sp.result, ["ok", "fail"] as const),
    user: cleanText(sp.user, 36) || undefined,
    unknown: pickOne(sp.unknown, ["1"] as const),
  };
  const filters = activeFilters({ ...logFilters });

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(days, page, logFilters);
  } catch {
    data = null;
  }

  return (
    <AdminShell
      title="ต้นทุน AI"
      description={`โทเค็นและต้นทุนของการเรียก AI ทุกครั้ง (คิดเป็นบาทที่ ฿${usdThb}/ดอลลาร์ แก้ราคาโมเดลและอัตราแลกที่เมนู "ตั้งราคา")`}
    >
      <FilterTabs base={`${base}/ai-usage`} param="days" current={range} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />

      {!data ? (
        <Panel className="p-6 text-muted-foreground">ยังไม่มีตาราง ai_usage — รัน drizzle-kit push เพื่อสร้างตาราง (หรือฐานข้อมูลเชื่อมต่อไม่ได้ชั่วคราว)</Panel>
      ) : data.totals.calls === 0 ? (
        <Panel className="p-6 text-muted-foreground">ยังไม่มีการเรียก AI ในช่วงนี้ ข้อมูลจะเริ่มสะสมหลังมีผู้ใช้หรือระบบเรียก AI ครั้งแรก</Panel>
      ) : (
        <Report data={data} usdThb={usdThb} base={base} range={range} days={days} page={page} filters={filters} />
      )}
    </AdminShell>
  );
}

function Report({
  data,
  usdThb,
  base,
  range,
  days,
  page,
  filters,
}: {
  data: NonNullable<Awaited<ReturnType<typeof load>>>;
  usdThb: number;
  base: string;
  range: string;
  days: number;
  page: number;
  filters: Record<string, string>;
}) {
  const { totals, byFeature, byModel, byDay, logTotal, log, spends, bahtPerCoin, topupKnown, daily, prev, extra } = data;
  const totalBaht = microUsdToBaht(Number(totals.micro), usdThb);
  const okCalls = Number(totals.ok);
  const calls = Number(totals.calls);
  const avg = okCalls > 0 ? totalBaht / okCalls : 0;
  const coinsByFeature = new Map(spends.map((s) => [s.feature ?? "", Number(s.coins)]));

  const tokenTotal = Number(totals.tin) + Number(totals.tout);
  const prevBaht = microUsdToBaht(Number(prev.micro), usdThb);
  const users = Number(extra.users);
  const userBaht = microUsdToBaht(Number(extra.userMicro), usdThb);

  // กราฟรายวัน: คีย์เป็นวันที่ไทย เติมวันที่ว่างให้ครบช่วง
  const costSeries = fillDays(days, new Map(daily.map((d) => [d.day, microUsdToBaht(Number(d.micro), usdThb)])));
  const tokenSeries = fillDays(days, new Map(daily.map((d) => [d.day, Number(d.tokens)])));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="จำนวนครั้ง" value={num(calls)} delta={<Delta current={calls} previous={Number(prev.calls)} goodWhen="up" />} hint={`สำเร็จ ${num(okCalls)} · ล้มเหลว ${num(Number(totals.failed))}`} />
        <StatTile label="โทเค็นรวม" value={num(tokenTotal)} delta={<Delta current={tokenTotal} previous={Number(prev.tokens)} goodWhen="up" />} hint={`ขาเข้า ${num(Number(totals.tin))} · ขาออก ${num(Number(totals.tout))}`} />
        <StatTile label="ต้นทุนรวม" value={baht(totalBaht)} delta={<Delta current={totalBaht} previous={prevBaht} goodWhen="down" />} hint={`${days} วันล่าสุด`} />
        <StatTile label="ต้นทุนเฉลี่ยต่อครั้ง" value={baht(avg)} hint="เฉพาะครั้งที่สำเร็จ" />
        <StatTile label="อัตราสำเร็จ" value={calls > 0 ? `${((okCalls / calls) * 100).toFixed(1)}%` : "-"} hint={`ล้มเหลว ${num(Number(totals.failed))} จาก ${num(calls)} ครั้ง`} />
        <StatTile label="เวลาเฉลี่ยต่อครั้ง" value={`${(Number(extra.avgMs) / 1000).toFixed(1)} วินาที`} hint="เฉพาะครั้งที่สำเร็จ" />
        <StatTile label="โทเค็นเฉลี่ยต่อครั้ง" value={okCalls > 0 ? num(Math.round(tokenTotal / okCalls)) : "-"} hint="ขาเข้า + ขาออก" />
        <StatTile label="ต้นทุนต่อผู้ใช้ที่ใช้งาน" value={users > 0 ? baht(userBaht / users) : "-"} hint={`ผู้ใช้ที่ใช้ AI ${num(users)} คน (ไม่นับงานของระบบ)`} />
      </div>
      {Number(totals.unknown) > 0 && (
        <p className="mt-3">
          <StatusBadge tone="warning">{num(Number(totals.unknown))} ครั้งยังไม่ทราบราคาโมเดล — ตั้งราคาใน &quot;ตั้งราคา&quot;</StatusBadge>
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ColumnChart title="ต้นทุน AI รายวัน (฿)" data={costSeries} color={VIZ.orange} format={baht} />
        <ColumnChart title="โทเค็นรายวัน" data={tokenSeries} color={VIZ.blue} format={num} />
        <HBarList
          title="ต้นทุนแยกตามฟีเจอร์ (฿)"
          items={byFeature.map((f) => ({ label: FEATURE_LABEL[f.feature] ?? f.feature, value: microUsdToBaht(Number(f.micro), usdThb) })).filter((i) => i.value > 0)}
          color={VIZ.orange}
          format={baht}
          empty="ยังไม่มีต้นทุนที่ทราบราคาในช่วงนี้"
        />
        <HBarList
          title="ต้นทุนแยกตามโมเดล (฿)"
          items={byModel.map((m) => ({ label: m.model, value: microUsdToBaht(Number(m.micro), usdThb) })).filter((i) => i.value > 0)}
          color={VIZ.orange}
          format={baht}
          empty="ยังไม่มีต้นทุนที่ทราบราคาในช่วงนี้"
        />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-bold">แยกตามฟีเจอร์</h2>
      <DataTable className="[&_table]:min-w-[900px]">
        <thead>
          <tr>
            <Th>ฟีเจอร์</Th>
            <Th className="text-right">ครั้ง</Th>
            <Th className="text-right">โทเค็น เข้า/ออก</Th>
            <Th className="text-right">ต้นทุน</Th>
            <Th className="text-right">เฉลี่ย/ครั้ง</Th>
            <Th className="text-right">รายได้โดยประมาณ</Th>
            <Th className="text-right">กำไรโดยประมาณ</Th>
          </tr>
        </thead>
        <tbody>
          {byFeature.map((f) => {
            const cost = microUsdToBaht(Number(f.micro), usdThb);
            const calls = Number(f.calls);
            const coins = coinsByFeature.get(f.feature);
            const paid = f.feature !== "horoscope" && coins !== undefined;
            const revenue = paid ? coins * bahtPerCoin : null;
            const margin = revenue === null ? null : revenue - cost;
            return (
              <Tr key={f.feature}>
                <Td className="font-medium">{FEATURE_LABEL[f.feature] ?? f.feature}</Td>
                <Td className="text-right">{num(calls)}</Td>
                <Td className="text-right text-muted-foreground">
                  {num(Number(f.tin))} / {num(Number(f.tout))}
                </Td>
                <Td className="text-right">{baht(cost)}</Td>
                <Td className="text-right text-muted-foreground">{baht(calls > 0 ? cost / calls : 0)}</Td>
                <Td className="text-right">{revenue === null ? "-" : baht(revenue)}</Td>
                <Td className={`text-right font-semibold ${margin === null ? "" : margin >= 0 ? "text-emerald-300" : "text-red-300"}`}>{margin === null ? "-" : baht(margin)}</Td>
              </Tr>
            );
          })}
        </tbody>
      </DataTable>
      <p className="mt-2 text-xs text-muted-foreground">
        รายได้ = coin ที่ลูกค้าใช้กับฟีเจอร์นั้น (หักที่คืนแล้ว) × ราคาขายเฉลี่ย ฿{bahtPerCoin.toFixed(2)}/coin
        {topupKnown ? " (จากการเติมที่ยืนยันแล้ว ไม่นับโบนัส)" : " (ยังไม่มีการเติม จึงใช้ค่าสมมติ 0.90)"} เป็นค่าประมาณ ไม่รวมค่าธรรมเนียมชำระเงิน ดวงล่วงหน้าเป็นต้นทุนของระบบ ไม่มีรายได้ตรง
      </p>

      <h2 className="mt-8 mb-2 text-lg font-bold">แยกตามโมเดล</h2>
      <DataTable className="[&_table]:min-w-[820px]">
        <thead>
          <tr>
            <Th>โมเดล</Th>
            <Th>ผู้ให้บริการ</Th>
            <Th className="text-right">ครั้ง</Th>
            <Th className="text-right">โทเค็น เข้า/ออก</Th>
            <Th className="text-right">ต้นทุน</Th>
            <Th className="text-right">เฉลี่ย/ครั้ง</Th>
            <Th className="text-right">สัดส่วน</Th>
          </tr>
        </thead>
        <tbody>
          {byModel.map((m) => {
            const cost = microUsdToBaht(Number(m.micro), usdThb);
            const calls = Number(m.calls);
            return (
              <Tr key={`${m.provider}-${m.model}`}>
                <Td className="font-mono text-xs">{m.model}</Td>
                <Td className="text-muted-foreground">{m.provider}</Td>
                <Td className="text-right">{num(calls)}</Td>
                <Td className="text-right text-muted-foreground">
                  {num(Number(m.tin))} / {num(Number(m.tout))}
                </Td>
                <Td className="text-right">{baht(cost)}</Td>
                <Td className="text-right text-muted-foreground">{baht(calls > 0 ? cost / calls : 0)}</Td>
                <Td className="text-right text-muted-foreground">{totalBaht > 0 ? `${((cost / totalBaht) * 100).toFixed(0)}%` : "-"}</Td>
              </Tr>
            );
          })}
        </tbody>
      </DataTable>

      <h2 className="mt-8 mb-2 text-lg font-bold">วันต่อวัน</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>วันที่</Th>
            <Th className="text-right">ครั้ง</Th>
            <Th className="text-right">ต้นทุน</Th>
          </tr>
        </thead>
        <tbody>
          {byDay.map((d) => (
            <Tr key={d.day}>
              <Td>{new Date(`${d.day}T12:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" })}</Td>
              <Td className="text-right">{num(Number(d.calls))}</Td>
              <Td className="text-right">{baht(microUsdToBaht(Number(d.micro), usdThb))}</Td>
            </Tr>
          ))}
          {byDay.length === 0 && <EmptyRow cols={3}>ไม่มีข้อมูล</EmptyRow>}
        </tbody>
      </DataTable>

      <h2 className="mt-8 mb-2 text-lg font-bold">รายการเรียกล่าสุด</h2>
      <FilterBar
        path={`${base}/ai-usage`}
        values={filters}
        keep={{ days: range }}
        fields={[
          { name: "feature", label: "ฟีเจอร์", type: "select", options: [{ value: "", label: "ทั้งหมด" }, ...Object.entries(FEATURE_LABEL).map(([value, label]) => ({ value, label }))] },
          { name: "model", label: "โมเดล", type: "select", options: [{ value: "", label: "ทั้งหมด" }, ...byModel.map((m) => ({ value: m.model, label: m.model }))] },
          {
            name: "result",
            label: "ผลลัพธ์",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "ok", label: "สำเร็จ" },
              { value: "fail", label: "ล้มเหลว" },
            ],
          },
          { name: "user", label: "รหัสผู้ใช้ (ขึ้นต้นด้วย)", type: "text", placeholder: "8 ตัวแรกของรหัส" },
          {
            name: "unknown",
            label: "ราคาโมเดล",
            type: "select",
            options: [
              { value: "", label: "ทั้งหมด" },
              { value: "1", label: "เฉพาะที่ไม่ทราบราคา" },
            ],
          },
        ]}
      />
      <DataTable className="[&_table]:min-w-[1100px]">
        <thead>
          <tr>
            <Th>เวลา</Th>
            <Th>ฟีเจอร์</Th>
            <Th>โมเดล</Th>
            <Th className="text-right">โทเค็น เข้า/ออก</Th>
            <Th className="text-right">ต้นทุน</Th>
            <Th className="text-right">เวลา (วิ)</Th>
            <Th>สถานะ</Th>
            <Th>สาเหตุที่ล้มเหลว</Th>
            <Th>ผู้ใช้</Th>
          </tr>
        </thead>
        <tbody>
          {log.map((r) => (
            <Tr key={r.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(r.createdAt)}</Td>
              <Td>{FEATURE_LABEL[r.feature] ?? r.feature}</Td>
              <Td>
                <span className="font-mono text-xs">{r.model}</span>
                <span className="block text-xs text-muted-foreground">{r.provider}</span>
              </Td>
              <Td className="text-right text-muted-foreground">
                {num(r.promptTokens)} / {num(r.completionTokens)}
              </Td>
              <Td className="text-right">{r.costMicroUsd === null ? <span className="text-amber-300">ไม่ทราบราคา</span> : baht(microUsdToBaht(r.costMicroUsd, usdThb))}</Td>
              <Td className="text-right text-muted-foreground">{(r.ms / 1000).toFixed(1)}</Td>
              <Td>{r.ok ? <StatusBadge tone="success">สำเร็จ</StatusBadge> : <StatusBadge tone="danger">ล้มเหลว</StatusBadge>}</Td>
              <Td className="min-w-[14rem] max-w-[22rem] whitespace-normal text-xs text-red-200">
                {r.ok ? <span className="text-muted-foreground">-</span> : (r.error ?? "ไม่มีบันทึกสาเหตุ (เกิดก่อนเพิ่มระบบบันทึก)")}
              </Td>
              <Td>
                {r.userId ? (
                  <Link href={`${base}/users/${r.userId}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                    {r.userId.slice(0, 8)}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">ระบบ</span>
                )}
              </Td>
            </Tr>
          ))}
          {log.length === 0 && <EmptyRow cols={9}>{Object.keys(filters).length ? "ไม่พบรายการตามตัวกรอง" : "ไม่มีรายการ"}</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={logTotal} path={`${base}/ai-usage`} params={{ days: range, ...filters }} />
    </>
  );
}

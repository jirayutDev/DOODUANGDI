import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, morDuLedger, morDus } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { loginHref } from "@/lib/safe-next";
import { coinsToBaht, fmtThaiDateTime, STATUS_LABEL } from "@/lib/booking";
import { getPricing } from "@/lib/pricing";
import { StatTile, StatusBadge } from "@/components/admin/ui";
import { ColumnChart, Delta, HBarList, VIZ, fillDays } from "@/components/admin/charts";
import { MorDuBookingActions } from "@/components/booking/booking-actions";
import { PayoutInfoForm } from "./payout-info-form";

export const metadata = { title: "หลังบ้านหมอดู · ดูดวงดิ" };

type Row = typeof bookings.$inferSelect;

const toLite = (r: Row) => ({ id: r.id, status: r.status, startsAt: r.startsAt.toISOString(), meetUrl: r.meetUrl, priceCoins: r.priceCoins });

function Section({ title, list, empty }: { title: string; list: Row[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {list.map((r) => {
          const s = STATUS_LABEL[r.status];
          return (
            <div key={r.id} className="rounded-2xl border border-line-soft bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {fmtThaiDateTime(r.startsAt)} · {r.durationMin} นาที
                </p>
                <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-soft-text">{r.topic}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ลูกค้าจ่าย {r.priceCoins.toLocaleString("th-TH")} coin · คุณได้รับ {(r.priceCoins - r.commissionCoins).toLocaleString("th-TH")} coin
              </p>
              <div className="mt-3">
                <MorDuBookingActions booking={toLite(r)} />
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="rounded-2xl border border-line-soft bg-card p-5 text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}

// ช่วงเวลาของสถิติ (อ่านเวลาปัจจุบันนอกตัว component ตามกฎ purity ของ React)
function statWindows() {
  const now = Date.now();
  return { now, since30: new Date(now - 30 * 86_400_000), since60: new Date(now - 60 * 86_400_000) };
}

export default async function MorDuDashboardPage() {
  const user = (await (await createClient()).auth.getUser()).data.user;
  if (!user) redirect(loginHref("/mor-du/dashboard"));

  const db = getDb();
  const [m] = await db.select().from(morDus).where(eq(morDus.userId, user.id)).limit(1);
  if (!m) {
    return (
      <div className="mx-auto max-w-[640px] px-[18px] py-10 text-center">
        <p className="text-soft-text">คุณยังไม่ได้สมัครเป็นหมอดู</p>
        <Link href="/mor-du/apply" className="mt-3 inline-block text-primary underline underline-offset-4">
          สมัครเป็นหมอดู
        </Link>
      </div>
    );
  }

  const pricing = await getPricing();
  const { now, since30, since60 } = statWindows();
  // ทุกคิวรีผูกกับหมอดูที่ล็อกอินอยู่เท่านั้น (morDuId = user.id)
  const [rows, [totals], statusCounts, dailyEarn, [earn]] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.morDuId, user.id)).orderBy(desc(bookings.startsAt)).limit(60),
    db
      .select({
        earned: sql<number>`coalesce(sum(case when ${morDuLedger.amountCoins} > 0 then ${morDuLedger.amountCoins} else 0 end), 0)::int`,
        paidOut: sql<number>`coalesce(-sum(case when ${morDuLedger.amountCoins} < 0 then ${morDuLedger.amountCoins} else 0 end), 0)::int`,
        balance: sql<number>`coalesce(sum(${morDuLedger.amountCoins}), 0)::int`,
      })
      .from(morDuLedger)
      .where(eq(morDuLedger.morDuId, user.id)),
    // จำนวนคิวแยกตามสถานะ (ทั้งหมดของหมอดูคนนี้)
    db.select({ status: bookings.status, n: count() }).from(bookings).where(eq(bookings.morDuId, user.id)).groupBy(bookings.status),
    // รายได้ coin รายวัน 30 วันล่าสุด ตามวันเวลาไทย (เฉพาะรายการรายได้ ไม่นับการโอนออก)
    db
      .select({
        day: sql<string>`to_char(${morDuLedger.createdAt} at time zone 'Asia/Bangkok', 'YYYY-MM-DD')`,
        coins: sql<number>`coalesce(sum(${morDuLedger.amountCoins}), 0)::int`,
      })
      .from(morDuLedger)
      .where(and(eq(morDuLedger.morDuId, user.id), eq(morDuLedger.kind, "earning"), gte(morDuLedger.createdAt, since30)))
      .groupBy(sql`1`),
    // รายได้ 30 วันล่าสุด เทียบ 30 วันก่อนหน้า และค่าเฉลี่ยต่อคิวตลอดกาล
    db
      .select({
        last30: sql<number>`coalesce(sum(${morDuLedger.amountCoins}) filter (where ${morDuLedger.createdAt} >= ${since30}), 0)::int`,
        prev30: sql<number>`coalesce(sum(${morDuLedger.amountCoins}) filter (where ${morDuLedger.createdAt} >= ${since60} and ${morDuLedger.createdAt} < ${since30}), 0)::int`,
        avgPerSession: sql<number>`coalesce(round(avg(${morDuLedger.amountCoins})), 0)::int`,
      })
      .from(morDuLedger)
      .where(and(eq(morDuLedger.morDuId, user.id), eq(morDuLedger.kind, "earning"))),
  ]);

  const countOf = (s: string) => statusCounts.find((c) => c.status === s)?.n ?? 0;
  const totalSessions = statusCounts.reduce((a, c) => a + c.n, 0);
  // อัตราที่รับคิว = คิวที่ตอบรับ (รับแล้ว/จ่ายแล้ว/เสร็จสิ้น) ต่อคิวที่ตอบแล้วทั้งหมด (รวมที่ปฏิเสธ) ไม่นับที่ยังรอตอบหรือยกเลิก
  const accepted = countOf("accepted") + countOf("paid") + countOf("completed");
  const answered = accepted + countOf("declined");
  const earnSeries = fillDays(30, new Map(dailyEarn.map((d) => [d.day, Number(d.coins)])), now);

  const waiting = rows.filter((r) => r.status === "requested");
  const active = rows.filter((r) => r.status === "accepted" || r.status === "paid");
  const history = rows.filter((r) => ["completed", "declined", "cancelled"].includes(r.status));
  const approved = m.status === "approved";

  return (
    <div className="mx-auto max-w-[860px] px-[18px] pb-12 pt-4 md:px-10 md:pt-8">
      <h1 className="text-[28px] font-bold leading-[1.55] md:text-[36px]">หลังบ้านหมอดู</h1>
      <p className="text-soft-text">
        {m.displayName}
        {!approved && <span className="ml-2 text-sm text-primary">(สถานะ: {m.status === "pending" ? "รอแอดมินอนุมัติ" : m.status === "suspended" ? "ถูกพักใช้งาน" : "ไม่ผ่านการอนุมัติ"})</span>}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "รายได้สะสม", value: totals.earned },
          { label: "โอนให้แล้ว", value: totals.paidOut },
          { label: "ยอดคงเหลือรอโอน", value: totals.balance },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border border-line-soft bg-card p-4">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className="mt-1 text-xl font-bold text-primary">{x.value.toLocaleString("th-TH")} coin</p>
            {x.label === "ยอดคงเหลือรอโอน" && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                ≈ ฿{coinsToBaht(x.value, pricing.coinBahtRate).toLocaleString("th-TH")} ตอนโอน (อัตรา ฿{pricing.coinBahtRate}/coin)
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        เว็บหักค่าบริการ {pricing.morDuCommissionPercent}% ของ coin ที่ลูกค้าจ่าย รายได้เข้ายอดเมื่อคุณกด &ldquo;เสร็จสิ้น&rdquo; หลังให้คำปรึกษา แอดมินโอนยอดคงเหลือให้ตามช่องทางที่คุณบันทึกไว้
      </p>

      <h2 className="mt-8 text-xl font-bold">สถิติของคุณ</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="คิวทั้งหมด" value={totalSessions.toLocaleString("th-TH")} hint="ทุกสถานะ" />
        <StatTile label="เสร็จสิ้น" value={countOf("completed").toLocaleString("th-TH")} hint="ให้คำปรึกษาจบแล้ว" />
        <StatTile label="อัตราที่รับคิว" value={answered > 0 ? `${Math.round((accepted / answered) * 100)}%` : "-"} hint={answered > 0 ? `รับ ${accepted} จาก ${answered} คำขอที่ตอบแล้ว` : "ยังไม่มีคำขอที่ตอบ"} />
        <StatTile label="รายได้เฉลี่ยต่อคิว" value={`${Number(earn.avgPerSession).toLocaleString("th-TH")} coin`} hint="เฉพาะคิวที่เสร็จสิ้น" />
        <StatTile
          label="รายได้ 30 วันล่าสุด"
          value={`${Number(earn.last30).toLocaleString("th-TH")} coin`}
          delta={<Delta current={Number(earn.last30)} previous={Number(earn.prev30)} goodWhen="up" />}
          hint={`≈ ฿${coinsToBaht(Number(earn.last30), pricing.coinBahtRate).toLocaleString("th-TH")}`}
        />
      </div>
      <div className="mt-4 grid gap-4">
        <ColumnChart title="รายได้ coin รายวัน (30 วัน)" data={earnSeries} color={VIZ.violet} format={(n) => `${n.toLocaleString("th-TH")} coin`} />
        <HBarList
          title="สถานะคิวทั้งหมด"
          items={statusCounts
            .filter((c) => c.n > 0)
            .map((c) => ({ label: STATUS_LABEL[c.status]?.label ?? c.status, value: c.n, sub: undefined }))
            .sort((a, b) => b.value - a.value)}
          color={VIZ.violet}
          format={(n) => `${n.toLocaleString("th-TH")} คิว`}
          empty="ยังไม่มีคิว"
        />
      </div>

      <PayoutInfoForm initial={m.payoutInfo ?? ""} />

      <Section title="คำขอคิวใหม่" list={waiting} empty="ยังไม่มีคำขอคิวใหม่" />
      <Section title="คิวที่รับแล้ว" list={active} empty="ยังไม่มีคิวที่รับไว้" />
      <Section title="ประวัติ" list={history} empty="ยังไม่มีประวัติ" />
      {!m.priceLiveMinute && (
        <p className="mt-8 rounded-2xl border border-primary/50 bg-primary/10 p-4 text-sm text-soft-text">
          คุณยังไม่ได้ตั้งราคาต่อนาที ลูกค้าจึงขอคิวไม่ได้ ติดต่อแอดมินเพื่อตั้งราคา
        </p>
      )}
    </div>
  );
}

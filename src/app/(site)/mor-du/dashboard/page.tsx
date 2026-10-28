import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, morDuLedger, morDus } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { loginHref } from "@/lib/safe-next";
import { fmtThaiDateTime, STATUS_LABEL, commissionPercent } from "@/lib/booking";
import { StatusBadge } from "@/components/admin/ui";
import { MorDuBookingActions } from "@/components/booking/booking-actions";
import { PayoutInfoForm } from "./payout-info-form";

export const metadata = { title: "หลังบ้านหมอดู · ดูดวงดิ" };

type Row = typeof bookings.$inferSelect;

const toLite = (r: Row) => ({ id: r.id, status: r.status, startsAt: r.startsAt.toISOString(), meetUrl: r.meetUrl, priceBaht: r.priceBaht });

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
                ลูกค้าจ่าย ฿{r.priceBaht.toLocaleString("th-TH")} · คุณได้รับ ฿{(r.priceBaht - r.commissionBaht).toLocaleString("th-TH")}
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

  const [rows, [totals]] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.morDuId, user.id)).orderBy(desc(bookings.startsAt)).limit(60),
    db
      .select({
        earned: sql<number>`coalesce(sum(case when ${morDuLedger.amountBaht} > 0 then ${morDuLedger.amountBaht} else 0 end), 0)::int`,
        paidOut: sql<number>`coalesce(-sum(case when ${morDuLedger.amountBaht} < 0 then ${morDuLedger.amountBaht} else 0 end), 0)::int`,
        balance: sql<number>`coalesce(sum(${morDuLedger.amountBaht}), 0)::int`,
      })
      .from(morDuLedger)
      .where(eq(morDuLedger.morDuId, user.id)),
  ]);

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
            <p className="mt-1 text-xl font-bold text-primary">฿{x.value.toLocaleString("th-TH")}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        เว็บหักค่าบริการ {commissionPercent()}% ของราคาที่ลูกค้าจ่าย รายได้เข้ายอดเมื่อคุณกด &ldquo;เสร็จสิ้น&rdquo; หลังให้คำปรึกษา แอดมินโอนยอดคงเหลือให้ตามช่องทางที่คุณบันทึกไว้
      </p>

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

import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, morDus } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { loginHref } from "@/lib/safe-next";
import { fmtThaiDateTime, STATUS_LABEL } from "@/lib/booking";
import { StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "การจองคิวของฉัน · ดูดวงดิ" };

export default async function MyBookingsPage() {
  const user = (await (await createClient()).auth.getUser()).data.user;
  if (!user) redirect(loginHref("/mor-du/bookings"));

  const rows = await getDb()
    .select({ b: bookings, name: morDus.displayName })
    .from(bookings)
    .leftJoin(morDus, eq(morDus.userId, bookings.morDuId))
    .where(eq(bookings.customerId, user.id))
    .orderBy(desc(bookings.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-[760px] px-[18px] pb-12 pt-4 md:px-10 md:pt-8">
      <h1 className="text-[28px] font-bold leading-[1.55] md:text-[36px]">การจองคิวของฉัน</h1>
      <div className="mt-5 flex flex-col gap-3">
        {rows.map(({ b, name }) => {
          const s = STATUS_LABEL[b.status];
          return (
            <Link key={b.id} href={`/mor-du/bookings/${b.id}`} className="rounded-2xl border border-line-soft bg-card p-4 transition-colors hover:border-primary">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold">{name ?? "หมอดู"}</p>
                <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-soft-text">
                {fmtThaiDateTime(b.startsAt)} · {b.durationMin} นาที · ฿{b.priceBaht.toLocaleString("th-TH")}
              </p>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-line-soft bg-card p-6 text-center text-muted-foreground">
            ยังไม่มีการจองคิว{" "}
            <Link href="/mor-du" className="text-primary underline underline-offset-4">
              เลือกหมอดู
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

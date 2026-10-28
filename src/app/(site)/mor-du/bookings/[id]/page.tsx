import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { bookings, morDus } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { loginHref } from "@/lib/safe-next";
import { fmtThaiDateTime, STATUS_LABEL } from "@/lib/booking";
import { StatusBadge } from "@/components/admin/ui";
import { CustomerBookingActions } from "@/components/booking/booking-actions";

export const metadata = { title: "การจองคิว · ดูดวงดิ" };

const HINT: Record<string, string> = {
  requested: "ส่งคำขอแล้ว รอหมอดูตอบรับ ยังไม่ต้องชำระเงิน",
  accepted: "หมอดูรับคิวแล้ว ชำระด้วย coin เพื่อยืนยันนัด",
  declined: "หมอดูไม่สะดวกในเวลานี้ ลองขอคิวเวลาอื่นหรือเลือกหมอดูท่านอื่นนะ",
  paid: "ชำระเงินแล้ว เข้าห้อง Google Meet ตามเวลานัด",
  completed: "การปรึกษาเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ",
  cancelled: "คิวนี้ถูกยกเลิกแล้ว",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const user = (await (await createClient()).auth.getUser()).data.user;
  if (!user) redirect(loginHref(`/mor-du/bookings/${id.data}`));

  const [row] = await getDb()
    .select({ b: bookings, name: morDus.displayName })
    .from(bookings)
    .leftJoin(morDus, eq(morDus.userId, bookings.morDuId))
    .where(and(eq(bookings.id, id.data), eq(bookings.customerId, user.id)))
    .limit(1);
  if (!row) notFound();
  const { b, name } = row;
  const s = STATUS_LABEL[b.status];
  const showMeet = b.status === "paid" || b.status === "completed";

  return (
    <div className="mx-auto max-w-[640px] px-[18px] pb-12 pt-4 md:px-10 md:pt-8">
      <Link href="/mor-du/bookings" className="text-sm text-muted-foreground hover:text-foreground">
        ← การจองของฉัน
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold leading-[1.55] md:text-[32px]">{name ?? "หมอดู"}</h1>
        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
      </div>
      <p className="mt-1 text-soft-text">{HINT[b.status]}</p>

      <dl className="mt-5 grid gap-3 rounded-2xl border border-line-soft bg-card p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">วันและเวลา</dt>
          <dd className="text-right font-medium">{fmtThaiDateTime(b.startsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">ระยะเวลา</dt>
          <dd>{b.durationMin} นาที</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">ราคา</dt>
          <dd className="font-bold text-primary">{b.priceCoins.toLocaleString("th-TH")} coin</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">เรื่องที่ปรึกษา</dt>
          <dd className="max-w-[60%] text-right text-soft-text">{b.topic}</dd>
        </div>
      </dl>

      {showMeet && (
        <div className="mt-5 rounded-2xl border border-primary/50 bg-primary/10 p-5 text-center">
          {b.meetUrl ? (
            <a
              href={b.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground no-underline"
            >
              เข้าห้อง Google Meet
            </a>
          ) : (
            <p className="text-soft-text">กำลังเตรียมลิงก์ห้อง Google Meet หมอดูจะส่งให้ที่หน้านี้ก่อนถึงเวลานัด ลองรีเฟรชอีกครั้งภายหลัง</p>
          )}
        </div>
      )}

      <div className="mt-5">
        <CustomerBookingActions booking={{ id: b.id, status: b.status, startsAt: b.startsAt.toISOString(), meetUrl: b.meetUrl, priceCoins: b.priceCoins }} />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        ต้องการยกเลิกหลังชำระเงินหรือมีปัญหา ติดต่อเราที่{" "}
        <Link href="/contact" className="underline underline-offset-4">
          หน้าติดต่อเรา
        </Link>{" "}
        พร้อมแจ้งเลขที่การจอง
      </p>
    </div>
  );
}

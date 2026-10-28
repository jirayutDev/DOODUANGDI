"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { handleCoinError } from "@/lib/coin-client";

export interface BookingLite {
  id: string;
  status: string;
  startsAt: string;
  meetUrl: string | null;
  priceCoins: number;
}

async function post(url: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "ทำรายการไม่สำเร็จ");
  return { ok: true, data };
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    try {
      const msg = await fn();
      if (msg) toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

// ปุ่มฝั่งลูกค้า: ยกเลิกคิวที่ยังไม่จ่าย / ชำระด้วย coin เมื่อหมอดูรับแล้ว (หัก coin จากกระเป๋าทันที)
export function CustomerBookingActions({ booking }: { booking: BookingLite }) {
  const router = useRouter();
  const { busy, run } = useAction();

  async function pay() {
    if (!window.confirm(`ชำระด้วย ${booking.priceCoins.toLocaleString("th-TH")} coin? ระบบหัก coin จากกระเป๋าของคุณทันที`)) return;
    try {
      const res = await fetch(`/api/bookings/${booking.id}/pay`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        // coin ไม่พอ -> กล่องแจ้งเตือนกลางจอพร้อมปุ่มเติม coin
        if (handleCoinError(data as { error?: string; code?: "login_required" | "insufficient_coins" })) return;
        throw new Error(typeof data.error === "string" ? data.error : "ชำระเงินไม่สำเร็จ");
      }
      window.dispatchEvent(new Event("coins:changed"));
      toast.success("ชำระด้วย coin แล้ว");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ชำระเงินไม่สำเร็จ");
    }
  }

  const canCancel = booking.status === "requested" || booking.status === "accepted";
  return (
    <div className="flex flex-col gap-3">
      {booking.status === "accepted" && (
        <Button disabled={!!busy} onClick={() => run("pay", pay)} className="h-auto min-h-[50px] rounded-[14px] text-base font-bold">
          {busy === "pay" ? "กำลังชำระ..." : `ชำระด้วย ${booking.priceCoins.toLocaleString("th-TH")} coin`}
        </Button>
      )}
      {canCancel && (
        <Button
          variant="ghost"
          disabled={!!busy}
          onClick={() => window.confirm("ยกเลิกคิวนี้?") && run("cancel", async () => { await post(`/api/bookings/${booking.id}/cancel`); return "ยกเลิกแล้ว"; })}
          className="h-auto min-h-[44px] rounded-[14px]"
        >
          ยกเลิกคิว
        </Button>
      )}
    </div>
  );
}

// ปุ่มฝั่งหมอดู: รับ/ปฏิเสธคำขอ, ตั้งลิงก์ Meet, กดเสร็จสิ้นหลังถึงเวลานัด
export function MorDuBookingActions({ booking }: { booking: BookingLite }) {
  const { busy, run } = useAction();
  const [link, setLink] = useState("");
  // เวลาปัจจุบันอ่านตอนแสดงผลฝั่งเบราว์เซอร์ (ไม่อยู่ในกระบวนการ render ของเซิร์ฟเวอร์) ใช้เปิดปุ่ม "เสร็จสิ้น" เมื่อถึงเวลานัด
  const [started] = useState(() => new Date(booking.startsAt).getTime() <= Date.now());

  if (booking.status === "requested") {
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={!!busy} onClick={() => run("accept", async () => { await post(`/api/bookings/${booking.id}/respond`, { action: "accept" }); return "รับคิวแล้ว รอลูกค้าชำระเงิน"; })}>
          รับคิว
        </Button>
        <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run("decline", async () => { await post(`/api/bookings/${booking.id}/respond`, { action: "decline" }); return "ปฏิเสธแล้ว"; })}>
          ปฏิเสธ
        </Button>
      </div>
    );
  }
  if (booking.status === "accepted") {
    return (
      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => window.confirm("ยกเลิกคิวนี้?") && run("cancel", async () => { await post(`/api/bookings/${booking.id}/cancel`); return "ยกเลิกแล้ว"; })}>
        ยกเลิกคิว
      </Button>
    );
  }
  if (booking.status === "paid") {
    return (
      <div className="flex flex-col gap-2">
        {booking.meetUrl ? (
          <a href={booking.meetUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">
            เข้าห้อง Google Meet
          </a>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run("retry", async () => { await post(`/api/bookings/${booking.id}/meet`); return "สร้างลิงก์ Meet แล้ว"; })}>
              ให้ระบบสร้างลิงก์ Meet
            </Button>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="หรือวางลิงก์ https://meet.google.com/..."
              aria-label="ลิงก์ Google Meet"
              className="h-9 min-w-[220px] flex-1 rounded-lg bg-cream px-3 text-sm text-ink outline-none placeholder:text-ink/40"
            />
            <Button size="sm" disabled={!!busy || !link.trim()} onClick={() => run("link", async () => { await post(`/api/bookings/${booking.id}/meet`, { meetUrl: link }); return "บันทึกลิงก์แล้ว"; })}>
              บันทึกลิงก์
            </Button>
          </div>
        )}
        <Button
          size="sm"
          disabled={!!busy || !started}
          onClick={() => window.confirm("ยืนยันว่าให้คำปรึกษาเสร็จแล้ว? รายได้จะเข้ายอดของคุณ") && run("complete", async () => { await post(`/api/bookings/${booking.id}/complete`); return "บันทึกเสร็จสิ้นแล้ว รายได้เข้ายอดของคุณแล้ว"; })}
        >
          {started ? "เสร็จสิ้น (รับรายได้)" : "ปุ่มเสร็จสิ้นจะเปิดเมื่อถึงเวลานัด"}
        </Button>
      </div>
    );
  }
  return null;
}

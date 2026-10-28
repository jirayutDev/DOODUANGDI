"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BOOKING_DURATIONS, priceFor, thaiLocalToDate } from "@/lib/booking";

const field = "h-12 w-full rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";

export function BookForm({ morDuId, perMinute }: { morDuId: string; perMinute: number }) {
  const router = useRouter();
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState<number>(BOOKING_DURATIONS[1]);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const price = priceFor(perMinute, duration);

  // ยอด coin ปัจจุบันของผู้ใช้ (แสดงให้เห็นก่อนขอคิว ไม่หักตอนขอ)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/coins/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { balance?: number } | null) => {
        if (!cancelled && typeof d?.balance === "number") setBalance(d.balance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!when) return toast.error("เลือกวันและเวลาที่สะดวก");
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ morDuId, startsAt: thaiLocalToDate(when).toISOString(), durationMin: duration, topic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "ขอคิวไม่สำเร็จ");
      toast.success("ส่งคำขอแล้ว รอหมอดูตอบรับ");
      router.push(`/mor-du/bookings/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ขอคิวไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft-text">
        วันและเวลาที่สะดวก (เวลาไทย)
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} step={900} required className={field} />
        <span className="text-xs font-normal text-muted-foreground">ขอล่วงหน้าอย่างน้อย 2 ชั่วโมง และไม่เกิน 60 วัน</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft-text">
        ระยะเวลา
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
          {BOOKING_DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} นาที — {priceFor(perMinute, d).toLocaleString("th-TH")} coin
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft-text">
        เรื่องที่อยากปรึกษา
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={4}
          maxLength={300}
          required
          placeholder="เล่าสั้นๆ ให้หมอดูเตรียมตัวได้ เช่น เรื่องงาน ความรัก วันเกิด"
          className="w-full rounded-xl bg-cream p-3 text-base text-ink outline-none placeholder:text-ink/40"
        />
      </label>

      <div className="rounded-xl bg-secondary p-4 text-sm text-soft-text">
        <p>
          ราคา <span className="text-lg font-bold text-primary">{price.toLocaleString("th-TH")} coin</span> ({perMinute} coin/นาที × {duration} นาที)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          ตอนนี้ยังไม่หัก coin รอหมอดูตอบรับคิวก่อน แล้วค่อยกดชำระด้วย coin ในหน้าการจอง ลิงก์ห้องประชุม Google Meet จะแสดงในหน้าการจองหลังชำระ
        </p>
        {balance !== null && (
          <p className={`mt-1 text-xs ${balance >= price ? "text-muted-foreground" : "text-red-400"}`}>
            coin ของคุณตอนนี้ {balance.toLocaleString("th-TH")}
            {balance < price ? " (ยังไม่พอสำหรับคิวนี้ เติม coin ได้ก่อนชำระ)" : ""}
          </p>
        )}
      </div>

      <Button type="submit" disabled={busy || !when || topic.trim().length < 5} className="h-auto min-h-[50px] rounded-[14px] text-base font-bold">
        {busy ? "กำลังส่งคำขอ..." : "ส่งคำขอคิว"}
      </Button>
    </form>
  );
}

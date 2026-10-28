"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PayoutInfoForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/mor-du/payout-info", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payoutInfo: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success("บันทึกช่องทางรับเงินแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-2xl border border-line-soft bg-card p-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft-text">
        ช่องทางรับเงิน (เห็นเฉพาะแอดมิน)
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="เช่น ธนาคาร... เลขบัญชี... ชื่อบัญชี... หรือเบอร์พร้อมเพย์"
          className="w-full rounded-xl bg-cream p-3 text-base font-normal text-ink outline-none placeholder:text-ink/40"
        />
      </label>
      <Button type="submit" disabled={busy || value.trim().length < 5} className="mt-3">
        {busy ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </form>
  );
}

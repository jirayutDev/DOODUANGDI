"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmModal } from "@/components/confirm-dialog";

const field = "h-11 w-full rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";

export function AdjustForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0) return toast.error("ใส่จำนวนเต็มที่ไม่ใช่ 0 (บวก = เพิ่ม, ลบ = หัก)");
    const r = await confirmModal({
      title: `${n > 0 ? "เพิ่ม" : "หัก"} ${Math.abs(n).toLocaleString("th-TH")} coin ให้ผู้ใช้นี้?`,
      message: `เหตุผล: ${reason.trim()}`,
      confirmLabel: n > 0 ? "เพิ่ม coin" : "หัก coin",
      tone: n > 0 ? "default" : "danger",
    });
    if (!r.confirmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users/adjust", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, amount: n, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
      toast.success("ปรับ coin แล้ว");
      setAmount("");
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-[18px] border border-line-soft p-5">
      <h2 className="text-xl font-bold">เพิ่ม/หัก coin</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="เช่น 50 หรือ -20" aria-label="จำนวน coin" className={field} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={100} placeholder="เหตุผล (จำเป็น)" aria-label="เหตุผล" className={field} />
        <Button type="submit" disabled={busy || !amount || !reason.trim()} className="h-11 rounded-xl px-6 font-semibold">
          {busy ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}

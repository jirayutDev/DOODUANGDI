"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// บันทึกว่าโอนเงินให้หมอดูแล้ว (ค่าเริ่มต้นคือยอดคงเหลือทั้งหมด แก้เป็นบางส่วนได้) เหตุผล/เลขอ้างอิงการโอนจำเป็นต้องกรอก
export function PayoutForm({ morDuId, balance }: { morDuId: string; balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(balance));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1 || n > balance) return toast.error("ยอดต้องเป็นจำนวนเต็มและไม่เกินยอดคงเหลือ");
    if (!window.confirm(`บันทึกว่าโอน ${n.toLocaleString("th-TH")} บาท ให้หมอดูแล้ว? (ทำย้อนกลับไม่ได้)`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ morDuId, amountBaht: n, note: note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success("บันทึกการโอนแล้ว");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" aria-label="ยอดที่โอน (บาท)" className="h-9 w-24 rounded-lg bg-cream px-2 text-right text-sm text-ink outline-none" />
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เลขอ้างอิงการโอน" aria-label="เลขอ้างอิงการโอน" className="h-9 w-40 rounded-lg bg-cream px-2 text-sm text-ink outline-none placeholder:text-ink/40" />
      <Button type="submit" size="sm" disabled={busy || !note.trim()}>
        {busy ? "..." : "บันทึกโอนแล้ว"}
      </Button>
    </form>
  );
}

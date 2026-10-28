"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { coinsToBaht } from "@/lib/booking";

// บันทึกว่าโอนเงินให้หมอดูแล้ว: กรอกจำนวน coin ที่หัก (ค่าเริ่มต้นคือยอดคงเหลือทั้งหมด แก้เป็นบางส่วนได้)
// แสดงยอดบาทที่ต้องโอนตามอัตราแลกปัจจุบัน เลขอ้างอิงการโอนจำเป็นต้องกรอก
export function PayoutForm({ morDuId, balance, rate }: { morDuId: string; balance: number; rate: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(balance));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= 1 && n <= balance;
  const baht = valid ? coinsToBaht(n, rate) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return toast.error("จำนวน coin ต้องเป็นจำนวนเต็มและไม่เกินยอดคงเหลือ");
    if (!window.confirm(`บันทึกว่าโอนให้หมอดูแล้ว: หัก ${n.toLocaleString("th-TH")} coin (โอนประมาณ ฿${coinsToBaht(n, rate).toLocaleString("th-TH")})? (ทำย้อนกลับไม่ได้)`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ morDuId, amountCoins: n, note: note.trim() }),
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
    <form onSubmit={submit} className="flex flex-wrap items-center justify-end gap-2">
      <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" aria-label="จำนวน coin ที่หัก" className="h-9 w-24 rounded-lg bg-cream px-2 text-right text-sm text-ink outline-none" />
      <span className="min-w-[96px] text-xs whitespace-nowrap text-soft-text">{baht !== null ? `โอนประมาณ ฿${baht.toLocaleString("th-TH")}` : "-"}</span>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เลขอ้างอิงการโอน" aria-label="เลขอ้างอิงการโอน" className="h-9 w-40 rounded-lg bg-cream px-2 text-sm text-ink outline-none placeholder:text-ink/40" />
      <Button type="submit" size="sm" disabled={busy || !valid || !note.trim()}>
        {busy ? "..." : "บันทึกโอนแล้ว"}
      </Button>
    </form>
  );
}

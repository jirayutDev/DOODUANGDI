"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// ยกเลิกคิวที่ชำระแล้วและคืน coin ให้ลูกค้า (แอดมินเท่านั้น) ต้องกรอกเหตุผลเสมอ
export function RefundButton({ bookingId, coins }: { bookingId: string; coins: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund() {
    const reason = window.prompt(`ยกเลิกคิวนี้และคืน ${coins.toLocaleString("th-TH")} coin ให้ลูกค้า\nกรอกเหตุผล (จำเป็น):`);
    if (!reason || !reason.trim()) return;
    if (!window.confirm(`ยืนยันยกเลิกและคืน ${coins.toLocaleString("th-TH")} coin? (ทำย้อนกลับไม่ได้)`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
      toast.success("ยกเลิกคิวและคืน coin แล้ว");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={refund}>
      {busy ? "กำลังทำรายการ..." : "ยกเลิก+คืน coin"}
    </Button>
  );
}

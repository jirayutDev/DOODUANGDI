"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmModal } from "@/components/confirm-dialog";

// ยกเลิกคิวที่ชำระแล้วและคืน coin ให้ลูกค้า (แอดมินเท่านั้น) ต้องกรอกเหตุผลเสมอ
export function RefundButton({ bookingId, coins }: { bookingId: string; coins: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund() {
    const r = await confirmModal({
      title: `ยกเลิกคิวนี้และคืน ${coins.toLocaleString("th-TH")} coin?`,
      message: "คืน coin เข้ากระเป๋าลูกค้าทันที ทำย้อนกลับไม่ได้",
      confirmLabel: "ยกเลิกคิวและคืน coin",
      tone: "danger",
      prompt: { label: "เหตุผล (จำเป็น)", required: true },
    });
    if (!r.confirmed) return;
    const reason = r.value;
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Action = "approve" | "reject" | "suspend";

const LABELS: Record<Action, { idle: string; busy: string; done: string }> = {
  approve: { idle: "อนุมัติ", busy: "กำลังอนุมัติ...", done: "อนุมัติแล้ว" },
  reject: { idle: "ปฏิเสธ", busy: "กำลังปฏิเสธ...", done: "ปฏิเสธแล้ว" },
  suspend: { idle: "พักใช้งาน", busy: "กำลังพัก...", done: "พักใช้งานแล้ว" },
};

// ปุ่มที่ใช้ได้ตามสถานะปัจจุบัน: รอตรวจ -> อนุมัติ/ปฏิเสธ, อนุมัติแล้ว -> พัก, ถูกพัก/ปฏิเสธ -> อนุมัติใหม่
const BY_STATUS: Record<string, Action[]> = {
  pending: ["approve", "reject"],
  approved: ["suspend"],
  suspended: ["approve"],
  rejected: ["approve"],
};

export function MorDuActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);

  async function act(action: Action) {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/mor-du/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(LABELS[action].done);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      {(BY_STATUS[status] ?? []).map((action, i) => (
        <Button key={action} size="sm" variant={i === 0 ? "default" : "ghost"} disabled={!!loading} onClick={() => act(action)}>
          {loading === action ? LABELS[action].busy : LABELS[action].idle}
        </Button>
      ))}
    </div>
  );
}

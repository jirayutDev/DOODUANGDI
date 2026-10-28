"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmModal } from "@/components/confirm-dialog";

export function SignRegenButton({ kind, sign, exists }: { kind: "daily" | "weekly" | "monthly"; sign: string; exists: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (exists) {
      const r = await confirmModal({
        title: `สร้างดวงราศี${sign}ใหม่?`,
        message: "ข้อความเดิมจะถูกแทนที่ ถ้าสร้างไม่สำเร็จ ข้อความเดิมยังอยู่",
        confirmLabel: "สร้างใหม่",
      });
      if (!r.confirmed) return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/horoscopes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, sign, regenerate: exists }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "สร้างไม่สำเร็จ");
      if (data.status === "failed") throw new Error(Array.isArray(data.reasons) && data.reasons.length ? data.reasons.join(" | ") : (data.hint ?? "สร้างไม่สำเร็จ"));
      toast.success(`สร้างราศี${sign}แล้ว`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้างไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={exists ? "ghost" : "default"} disabled={busy} onClick={run}>
      {busy ? "กำลังสร้าง..." : exists ? "สร้างใหม่" : "สร้าง"}
    </Button>
  );
}

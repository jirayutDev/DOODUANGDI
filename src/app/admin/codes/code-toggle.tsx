"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CodeToggle({ code, active }: { code: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, active: !active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
      toast.success(active ? "ปิดโค้ดแล้ว" : "เปิดโค้ดแล้ว");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={active ? "ghost" : "default"} disabled={busy} onClick={toggle}>
      {active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
    </Button>
  );
}

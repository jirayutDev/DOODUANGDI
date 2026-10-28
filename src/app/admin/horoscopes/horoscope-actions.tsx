"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function HoroscopeActions({ kind }: { kind: "daily" | "weekly" | "monthly" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"fill" | "redo" | null>(null);

  async function run(regenerate: boolean) {
    if (regenerate && !window.confirm("ลบดวงของช่วงนี้แล้วสร้างใหม่ทุกราศี? ผู้ใช้จะเห็นข้อความใหม่")) return;
    setBusy(regenerate ? "redo" : "fill");
    try {
      const res = await fetch("/api/admin/horoscopes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, regenerate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) throw new Error(data.error ?? "สร้างไม่สำเร็จ");
      if (data.failed?.length) toast.error(`สร้างไม่สำเร็จ ${data.failed.length} ราศี: ${data.failed.join(", ")}`);
      else toast.success(`สร้างใหม่ ${data.created} ราศี (ข้าม ${data.skipped})`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้างไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" disabled={!!busy} onClick={() => run(false)}>
        {busy === "fill" ? "กำลังสร้าง..." : "เติมที่ขาด"}
      </Button>
      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(true)}>
        {busy === "redo" ? "กำลังสร้างใหม่..." : "สร้างใหม่ทั้งหมด"}
      </Button>
    </div>
  );
}

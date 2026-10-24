"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";

export function CodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [coins, setCoins] = useState("50");
  const [maxUses, setMaxUses] = useState("1");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: code.trim() || undefined,
          coins: Number(coins),
          maxUses: Number(maxUses),
          expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`สร้างโค้ด ${data.code} แล้ว`);
      setCode("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้างโค้ดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[18px] border border-line-soft p-5 sm:grid-cols-2">
      <label className="text-sm text-soft-text sm:col-span-2">
        โค้ด (เว้นว่างเพื่อสุ่ม)
        <input className={field} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} />
      </label>
      <label className="text-sm text-soft-text">
        จำนวน coin
        <input className={field} type="number" min={1} value={coins} onChange={(e) => setCoins(e.target.value)} required />
      </label>
      <label className="text-sm text-soft-text">
        ใช้ได้กี่คน
        <input className={field} type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} required />
      </label>
      <label className="text-sm text-soft-text sm:col-span-2">
        หมดอายุ (ไม่บังคับ)
        <input className={field} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </label>
      <Button type="submit" disabled={busy} className="h-11 rounded-xl font-semibold sm:col-span-2">
        {busy ? "กำลังสร้าง..." : "สร้างโค้ด"}
      </Button>
    </form>
  );
}

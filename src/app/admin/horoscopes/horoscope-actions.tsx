"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";

type Kind = "daily" | "weekly" | "monthly";

// วนสร้างทีละราศี (3 ราศีพร้อมกัน) เพราะฟังก์ชันบนโฮสต์มีเวลาจำกัดสั้น สร้างทั้ง 12 ราศีในคำขอเดียวไม่ทัน
// ผลของแต่ละราศีไม่ขึ้นต่อกัน ตัวที่ล้มเหลวเก็บไว้บอกแล้วกดซ้ำเติมเฉพาะที่ขาดได้
const CONCURRENCY = 3;

export function HoroscopeActions({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"fill" | "redo" | null>(null);
  const [done, setDone] = useState(0);

  async function run(regenerate: boolean) {
    if (regenerate && !window.confirm("สร้างดวงของช่วงนี้ใหม่ทุกราศี? ผู้ใช้จะเห็นข้อความใหม่ (ถ้าราศีไหนสร้างไม่สำเร็จ ข้อความเดิมยังอยู่)")) return;
    setBusy(regenerate ? "redo" : "fill");
    setDone(0);
    const signs = [...ZODIAC_SIGN_NAMES];
    const failed: string[] = [];
    let created = 0;
    let skipped = 0;
    let lastError = "";

    async function worker() {
      for (let sign = signs.shift(); sign; sign = signs.shift()) {
        try {
          const res = await fetch("/api/admin/horoscopes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind, regenerate, sign }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            lastError = data.error ?? `HTTP ${res.status}`;
            failed.push(sign);
          } else if (data.status === "created") created++;
          else if (data.status === "skipped") skipped++;
          else {
            if (Array.isArray(data.reasons) && data.reasons.length) lastError = String(data.reasons[0]);
            else if (typeof data.hint === "string") lastError = data.hint;
            failed.push(sign);
          }
        } catch {
          failed.push(sign);
        }
        setDone((n) => n + 1);
      }
    }

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (failed.length) {
        toast.error(`สร้างไม่สำเร็จ ${failed.length} ราศี: ${failed.join(", ")}${lastError ? ` · ${lastError}` : ""} (กด "เติมที่ขาด" เพื่อลองใหม่)`);
      } else {
        toast.success(`สร้างใหม่ ${created} ราศี (ข้าม ${skipped})`);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const total = ZODIAC_SIGN_NAMES.length;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={!!busy} onClick={() => run(false)}>
        {busy === "fill" ? `กำลังสร้าง ${done}/${total}` : "เติมที่ขาด"}
      </Button>
      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(true)}>
        {busy === "redo" ? `กำลังสร้างใหม่ ${done}/${total}` : "สร้างใหม่ทั้งหมด"}
      </Button>
    </div>
  );
}

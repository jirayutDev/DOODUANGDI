"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { SianSiFortune } from "@/lib/sian-si";
import { cn } from "@/lib/utils";
import { handleCoinError, featureCostLabel, type CoinApiError } from "@/lib/coin-client";

export default function SianSiPage() {
  const [shaking, setShaking] = useState(false);
  const [result, setResult] = useState<SianSiFortune | null>(null);

  async function handleShake() {
    if (shaking) return;
    setShaking(true);
    setResult(null);
    try {
      const [res] = await Promise.all([
        fetch("/api/sian-si", { method: "POST" }),
        new Promise((r) => setTimeout(r, 900)),
      ]);
      const data = (await res.json().catch(() => null)) as
        | (CoinApiError & { result?: SianSiFortune })
        | null;
      if (!res.ok || !data?.result) {
        if (!handleCoinError(data)) toast.error(data?.error ?? "ระบบใช้งานไม่ได้ชั่วคราว");
        return;
      }
      window.dispatchEvent(new Event("coins:changed"));
      setResult(data.result);
    } catch {
      toast.error("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ");
    } finally {
      setShaking(false);
    }
  }

  const done = !!result && !shaking;

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">เสี่ยงทาย</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">เซียมซี</h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">ตั้งจิตอธิษฐาน แล้วเขย่ากระบอกขอเซียมซี</p>
      <p className="mt-2 max-w-[560px] text-xs text-muted-foreground/70">
        ใช้โครงสร้าง 28 เบอร์ตามธรรมเนียมเซียมซี (4 ทิศ × 7 ดาวบริวาร) กลอนแต่ละเบอร์ประพันธ์ขึ้นเอง
        ไม่ได้คัดลอกจากเซียมซีวัดใดวัดหนึ่ง
      </p>

      <div className="mt-[30px] flex flex-wrap items-center gap-x-20 gap-y-12">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col items-stretch gap-3.5">
          <div className="flex justify-center">
            <svg
              width="150"
              height="266"
              viewBox="0 -16 150 266"
              role="img"
              aria-label="กระบอกเซียมซี"
              className={cn(
                "origin-bottom transition-transform duration-300",
                shaking && "animate-shuffle",
                done && "-rotate-6"
              )}
            >
              <rect x="40" y="10" width="6" height="110" rx="1" fill="none" stroke="var(--color-foreground)" strokeWidth="1.2" transform="rotate(-8 43 120)" />
              <rect x="58" y="0" width="6" height="120" rx="1" fill="none" stroke="var(--color-foreground)" strokeWidth="1.2" />
              <rect x="74" y={done ? -14 : 2} width="6" height="120" rx="1" fill="var(--color-primary)" />
              <rect x="90" y="4" width="6" height="116" rx="1" fill="none" stroke="var(--color-foreground)" strokeWidth="1.2" />
              <rect x="104" y="12" width="6" height="108" rx="1" fill="none" stroke="var(--color-foreground)" strokeWidth="1.2" transform="rotate(8 107 120)" />
              <rect x="25" y="96" width="100" height="148" rx="4" fill="var(--color-background)" stroke="var(--color-primary)" strokeWidth="1.5" />
              <path d="M25 122h100M25 218h100" stroke="var(--color-primary)" strokeWidth="1" />
              <circle cx="75" cy="170" r="22" fill="none" stroke="var(--color-primary)" strokeWidth="1.2" />
              <path d="M75 154l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--color-primary)" />
            </svg>
          </div>
          <button
            type="button"
            onClick={handleShake}
            disabled={shaking}
            className="inline-flex min-h-[50px] min-w-[220px] items-center justify-center gap-2 self-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {shaking ? "กำลังเขย่า..." : done ? "เขย่าใหม่อีกครั้ง" : "เขย่าเซียมซี"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            ใช้ {featureCostLabel("sian-si")} · ต้องเข้าสู่ระบบและเป็นสมาชิก
          </p>
        </div>

        {done && result && (
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
            <div className="bg-foreground px-[26px] py-7 text-ink">
              <p className="text-lg text-[#5A4E7A]">ได้เซียมซีใบที่</p>
              <p className="text-[72px] font-semibold leading-none text-[#8A6420]">
                {result.number}
                <span className="ml-2 text-base font-normal text-[#5A4E7A]">จาก 28</span>
              </p>
              <p className="mt-3.5 border-t border-ink/25 pt-3.5 text-2xl font-bold leading-normal">
                {result.title}
              </p>
              <p className="mt-2 italic text-[#5A4E7A]">&ldquo;{result.verse}&rdquo;</p>
              <p className="mt-2">{result.meaning}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

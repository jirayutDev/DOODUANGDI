"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { handleCoinError, featureCostLabel, type CoinApiError } from "@/lib/coin-client";

interface DiceResult {
  die1: number;
  die2: number;
  sum: number;
  meaning: string;
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({
  value,
  tilt,
  rolling,
  delay,
}: {
  value: number;
  tilt: number;
  rolling: boolean;
  delay?: string;
}) {
  const accent = value === 1 || value === 4;
  return (
    <div
      role="img"
      aria-label={`ลูกเต๋าแต้ม ${value}`}
      style={{ rotate: `${tilt}deg`, animationDelay: delay }}
      className={cn(
        "grid size-[104px] grid-cols-3 gap-1.5 rounded-md border border-primary p-[18px]",
        rolling && "animate-shuffle"
      )}
    >
      {Array.from({ length: 9 }, (_, k) => (
        <span
          key={k}
          className={cn(
            "size-3.5 select-none self-center justify-self-center rounded-full",
            PIPS[value].includes(k)
              ? accent
                ? "bg-primary"
                : "bg-foreground"
              : "bg-transparent"
          )}
        />
      ))}
    </div>
  );
}

export default function DicePage() {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [count, setCount] = useState(0);

  async function handleRoll() {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    try {
      const [res] = await Promise.all([
        fetch("/api/dice", { method: "POST" }),
        new Promise((r) => setTimeout(r, 700)),
      ]);
      const data = (await res.json().catch(() => null)) as
        | (CoinApiError & { result?: DiceResult })
        | null;
      if (!res.ok || !data?.result) {
        if (!handleCoinError(data)) toast.error(data?.error ?? "ระบบใช้งานไม่ได้ชั่วคราว");
        return;
      }
      window.dispatchEvent(new Event("coins:changed"));
      setResult(data.result);
      setCount((n) => n + 1);
    } catch {
      toast.error("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ");
    } finally {
      setRolling(false);
    }
  }

  const tilt = count % 2 ? [7, -9] : [-6, 5];
  const d1 = result?.die1 ?? 5;
  const d2 = result?.die2 ?? 3;

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">เสี่ยงทาย</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">
        ลูกเต๋าพยากรณ์
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        ตั้งคำถามในใจ แล้วทอยเต๋า 2 ลูกดูคำตอบ
      </p>
      <p className="mt-2 max-w-[560px] text-xs text-muted-foreground/70">
        อิงวิธีเสี่ยงทายแบบตำราลูกเต๋าพยากรณ์ (ทอยลูกเต๋า 2 ลูกลงภาชนะ ดูแต้มที่ออก) ฉบับย่อ
        ความหมายที่แสดงเป็นการสรุปแบบทั่วไป ไม่ใช่ตำราต้นฉบับเต็มรูปแบบ
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-x-20 gap-y-10">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <div className="flex justify-center gap-7 pb-2 pt-3">
            <Die value={d1} tilt={tilt[0]} rolling={rolling} />
            <Die value={d2} tilt={tilt[1]} rolling={rolling} delay="100ms" />
          </div>
          <button
            type="button"
            onClick={handleRoll}
            disabled={rolling}
            className="mt-4 inline-flex min-h-[50px] min-w-[220px] items-center justify-center gap-2 self-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {rolling ? "กำลังทอย..." : "ทอยเต๋า"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            ใช้ {featureCostLabel("dice")} · ต้องเข้าสู่ระบบ
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          {result && !rolling ? (
            <>
              <p className="text-sm text-muted-foreground">ได้แต้มรวม</p>
              <p className="-mt-1.5 text-[96px] font-semibold leading-none text-primary">
                {result.sum}
              </p>
              <blockquote className="mt-2 rounded-[14px] bg-card px-4 py-3 text-lg">
                {result.meaning}
              </blockquote>
            </>
          ) : (
            <p className="text-soft-text">
              {rolling ? "กำลังทอยเต๋า..." : "กดทอยเต๋าเพื่อดูแต้มและคำทำนาย"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

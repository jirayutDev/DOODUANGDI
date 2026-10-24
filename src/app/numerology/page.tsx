"use client";

import { useState } from "react";
import { toast } from "sonner";
import { handleCoinError, featureCostLabel, type CoinApiError } from "@/lib/coin-client";

interface NumerologyResult {
  digits: string;
  root: number;
  title: string;
  meaning: string;
}

export default function NumerologyPage() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [paying, setPaying] = useState(false);
  const canCalc = !!value.replace(/\D/g, "");

  async function handleCalc() {
    if (!canCalc || paying) return;
    setPaying(true);
    try {
      const res = await fetch("/api/numerology", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await res.json().catch(() => null)) as
        | (CoinApiError & { result?: NumerologyResult })
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
      setPaying(false);
    }
  }

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">เสี่ยงทาย</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">
        เลขศาสตร์ผลรวม
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        เบอร์ใหม่ดีไหม? ใส่มาเลย น้องมูรวมเลขให้ เช็กเบอร์โทรศัพท์ หรือทะเบียนรถ
        ว่าผลรวมเลขให้พลังด้านไหน
      </p>
      <p className="mt-2 max-w-[560px] text-xs text-muted-foreground/70">
        อ้างอิงเลขศาสตร์ผลรวม (บวกเลขจนเหลือหลักเดียว) ตามระบบเลขศาสตร์สากล
      </p>

      <div className="mt-8 flex flex-wrap items-start gap-x-20 gap-y-10">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px]">
          <label
            htmlFor="number"
            className="flex flex-col gap-1.5 text-sm font-medium text-foreground"
          >
            เบอร์โทรหรือเลขทะเบียน
            <input
              id="number"
              type="text"
              inputMode="numeric"
              placeholder="เช่น 0812345678 หรือ กข1234"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-[50px] w-full rounded-xl bg-cream px-3.5 text-base text-ink outline-none [color-scheme:light] placeholder:text-ink/50 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <button
            type="button"
            onClick={handleCalc}
            disabled={!canCalc || paying}
            className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {paying ? "กำลังคำนวณ..." : "คำนวณ"}
          </button>
          <p className="text-xs text-muted-foreground">
            ใช้ {featureCostLabel("numerology")} · ต้องเข้าสู่ระบบและเป็นสมาชิก
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 md:border-l md:border-line-soft md:pl-[22px]">
          {result ? (
            <>
              <p className="text-sm text-muted-foreground">ผลรวมของเลขนี้</p>
              <p className="-mt-1.5 text-[96px] font-semibold leading-none text-primary">
                {result.root}
              </p>
              <p className="mt-1.5 text-[30px] font-bold leading-[1.55]">{result.title}</p>
              <p className="text-soft-text">{result.meaning}</p>
              <p className="text-xs text-muted-foreground">
                ตัวเลขที่ใช้คำนวณ: {result.digits}
              </p>
            </>
          ) : (
            <p className="text-soft-text">กรอกเบอร์หรือเลขทะเบียนเพื่อดูผลรวม</p>
          )}
        </div>
      </div>
    </div>
  );
}

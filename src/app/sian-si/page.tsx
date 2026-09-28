"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { drawSianSi, type SianSiFortune } from "@/lib/sian-si";
import { cn } from "@/lib/utils";

export default function SianSiPage() {
  const [shaking, setShaking] = useState(false);
  const [result, setResult] = useState<SianSiFortune | null>(null);

  function handleShake() {
    setShaking(true);
    setResult(null);
    setTimeout(() => {
      setResult(drawSianSi());
      setShaking(false);
    }, 900);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="mb-2 font-display text-3xl text-foreground">เซี่ยมซี</h1>
      <p className="mb-1 text-sm text-muted-foreground">ตั้งจิตอธิษฐาน แล้วเขย่ากระบอกขอเซียมซี</p>
      <p className="mb-8 text-xs text-muted-foreground/70">
        ใช้โครงสร้าง 28 เบอร์ตามธรรมเนียมเซียมซี (4 ทิศ × 7 ดาวบริวาร) กลอนแต่ละเบอร์ประพันธ์ขึ้นเอง
        ไม่ได้คัดลอกจากเซียมซีวัดใดวัดหนึ่ง
      </p>

      <div className="mb-8 flex justify-center">
        <div
          className={cn(
            "card-back flex h-32 w-16 items-center justify-center rounded-full",
            shaking && "animate-shuffle"
          )}
        >
          <span className="font-display text-2xl text-[var(--color-tarot-gold)]">签</span>
        </div>
      </div>

      <Button size="lg" onClick={handleShake} disabled={shaking}>
        {shaking ? "กำลังเขย่า..." : "เขย่าเซียมซี"}
      </Button>

      {result && !shaking && (
        <Card className="mt-8 bg-card">
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <p className="tarot-numeral text-sm">เซียมซีที่ {result.number} จาก 28</p>
            <p className="font-display text-xl text-foreground">{result.title}</p>
            <p className="text-sm italic text-muted-foreground">&ldquo;{result.verse}&rdquo;</p>
            <p className="mt-2 text-sm text-foreground">{result.meaning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

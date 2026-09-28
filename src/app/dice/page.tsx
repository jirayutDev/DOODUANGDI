"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { rollDice } from "@/lib/dice-fortune";
import { cn } from "@/lib/utils";

const DICE_FACE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export default function DicePage() {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof rollDice> | null>(null);

  function handleRoll() {
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      setResult(rollDice());
      setRolling(false);
    }, 700);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="mb-2 font-display text-3xl text-foreground">ลูกเต๋าพยากรณ์</h1>
      <p className="mb-1 text-sm text-muted-foreground">ตั้งคำถามในใจ แล้วทอยเต๋า 2 ลูกดูคำตอบ</p>
      <p className="mb-8 text-xs text-muted-foreground/70">
        อิงวิธีเสี่ยงทายแบบตำราลูกเต๋าพยากรณ์ (ทอยลูกเต๋า 2 ลูกลงภาชนะ ดูแต้มที่ออก) ฉบับย่อ
        ความหมายที่แสดงเป็นการสรุปแบบทั่วไป ไม่ใช่ตำราต้นฉบับเต็มรูปแบบ
      </p>

      <div className="mb-8 flex justify-center gap-4 text-6xl">
        <span className={cn(rolling && "animate-shuffle")}>
          {result ? DICE_FACE[result.die1] : "⚀"}
        </span>
        <span className={cn(rolling && "animate-shuffle")} style={{ animationDelay: "100ms" }}>
          {result ? DICE_FACE[result.die2] : "⚀"}
        </span>
      </div>

      <Button size="lg" onClick={handleRoll} disabled={rolling}>
        {rolling ? "กำลังทอย..." : "ทอยเต๋า"}
      </Button>

      {result && !rolling && (
        <Card className="mt-8 bg-card">
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <p className="tarot-numeral text-sm">รวม {result.sum} แต้ม</p>
            <p className="text-sm text-foreground">{result.meaning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

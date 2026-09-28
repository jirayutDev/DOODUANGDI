"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { THAI_DAY_NAMES } from "@/lib/astrology";
import { cn } from "@/lib/utils";

interface Result {
  dayName: string;
  luckyColor: string;
  reading: string;
}

export default function DailyHoroscopePage() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSelect(day: number) {
    setSelectedDay(day);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/daily-horoscope", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-center font-display text-3xl text-foreground">ดูดวงรายวัน</h1>
      <p className="mb-1 text-center text-sm text-muted-foreground">
        เลือกวันเกิดของคุณ (วันในสัปดาห์) เพื่อดูพลังงานวันนี้
      </p>
      <p className="mb-8 text-center text-xs text-muted-foreground/70">
        สีมงคลอ้างอิงตำราโหราศาสตร์ไทย (สีประจำวันตามเทวดานพเคราะห์) คำทำนายสร้างจากข้อมูลนี้โดย AI
      </p>

      <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {THAI_DAY_NAMES.map((name, i) => (
          <button
            key={name}
            onClick={() => handleSelect(i)}
            className={cn(
              "rounded-lg border px-3 py-3 text-sm transition-colors",
              selectedDay === i
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            วัน{name}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground">น้องมูกำลังดูดวงให้...</p>
      )}

      {result && !loading && (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-display text-xl text-foreground">คนเกิดวัน{result.dayName}</p>
            <p className="text-sm text-primary">สีมงคลวันนี้: {result.luckyColor}</p>
            <p className="text-sm text-muted-foreground">{result.reading}</p>
            <Button asChild size="sm" variant="secondary">
              <a href="/profile">กรอกวันเกิดเต็ม ดูดวงโปรไฟล์ละเอียดขึ้น</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

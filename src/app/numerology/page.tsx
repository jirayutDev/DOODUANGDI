"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { analyzeNumber } from "@/lib/numerology";

export default function NumerologyPage() {
  const [value, setValue] = useState("");
  const result = value.replace(/\D/g, "") ? analyzeNumber(value) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-center font-display text-3xl text-foreground">เลขศาสตร์ผลรวม</h1>
      <p className="mb-1 text-center text-sm text-muted-foreground">
        เช็กเบอร์โทรศัพท์ หรือทะเบียนรถ ว่าผลรวมเลขให้พลังด้านไหน
      </p>
      <p className="mb-8 text-center text-xs text-muted-foreground/70">
        อ้างอิงเลขศาสตร์ผลรวม (บวกเลขจนเหลือหลักเดียว) ตามระบบเลขศาสตร์สากล
      </p>

      <div className="mb-6 grid gap-2">
        <Label htmlFor="number">กรอกเบอร์โทรหรือเลขทะเบียน</Label>
        <Input
          id="number"
          placeholder="เช่น 0812345678 หรือ กข1234"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      {result && (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <p className="text-xs text-muted-foreground">ตัวเลขที่ใช้คำนวณ: {result.digits}</p>
            <p className="tarot-numeral text-3xl">{result.root}</p>
            <p className="font-display text-lg text-foreground">{result.title}</p>
            <p className="text-sm text-muted-foreground">{result.meaning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

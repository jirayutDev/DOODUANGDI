"use client";

import { ZodiacHoroscope } from "@/components/zodiac-horoscope";

export default function DailyHoroscopePage() {
  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">เลือกราศีของคุณ</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">ดวงรายวัน</h1>
      <p className="mt-2.5 max-w-[560px] text-sm text-muted-foreground">
        ดวงประจำวันของแต่ละราศี อัปเดตทุกวัน ทุกคนในราศีเดียวกันอ่านคำทำนายเดียวกัน ดูฟรี
      </p>
      <ZodiacHoroscope kind="daily" />
    </div>
  );
}

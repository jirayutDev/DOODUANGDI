import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateAllSigns, isHoroscopeKind, thaiNow } from "@/lib/horoscopes";

export const maxDuration = 60;

// เรียกโดย scheduler (vercel.json) ทุกชนิดรันเที่ยงคืนเวลาไทย:
//   daily   ทุกวัน           -> 17:00 UTC
//   weekly  ทุกวันอาทิตย์     -> เสาร์ 17:00 UTC
//   monthly วันที่ 1 ของเดือน -> cron รันวันที่ 28-31 17:00 UTC แล้วที่นี่ข้ามถ้าไม่ใช่วันที่ 1 ตามเวลาไทย
// ตั้ง CRON_SECRET ใน env — Vercel Cron จะแนบ Authorization: Bearer <CRON_SECRET> ให้เอง
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set; rejecting cron request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind");
  if (!isHoroscopeKind(kind)) return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  // ใช้เวลา +30 นาทีให้ตรงกับ generateAllSigns เผื่อ scheduler ยิงก่อนเที่ยงคืนเล็กน้อย
  const t = thaiNow(new Date(Date.now() + 30 * 60 * 1000));
  if (kind === "monthly" && t.getUTCDate() !== 1) return NextResponse.json({ skipped: "ไม่ใช่วันที่ 1" });
  if (kind === "weekly" && t.getUTCDay() !== 0) return NextResponse.json({ skipped: "ไม่ใช่วันอาทิตย์" });

  const result = await generateAllSigns(kind);
  return NextResponse.json(result, { status: result.failed.length ? 207 : 200 });
}

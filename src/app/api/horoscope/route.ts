import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { ensureHoroscope, getPeriod, isHoroscopeKind, isZodiacSign } from "@/lib/horoscopes";

// ดวงราศีรายวัน/สัปดาห์/เดือน — ฟรี ไม่ต้องล็อกอิน อ่านจากค่าที่ cron สร้างไว้
// ถ้ายังไม่มี (เช่น cron ยังไม่รัน) จะสร้างครั้งเดียวแล้วเก็บ ทุกคนที่เปิดทีหลังได้ค่าเดียวกัน
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    if (!(await rateLimit(`horo:${ip}`, 60, 60 * 1000))) {
      return NextResponse.json({ error: "คำขอถี่เกินไป ลองใหม่อีกครั้งในอีกสักครู่นะ" }, { status: 429 });
    }
  } catch {
    // ตัวจำกัดความถี่พัง ไม่ควรทำให้การอ่านดวงฟรีล่มไปด้วย
  }

  const kind = req.nextUrl.searchParams.get("kind");
  const sign = req.nextUrl.searchParams.get("sign");
  if (!isHoroscopeKind(kind) || !isZodiacSign(sign)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const period = getPeriod(kind);
  try {
    const content = await ensureHoroscope(kind, sign, period);
    if (!content) {
      return NextResponse.json({ error: "ตอนนี้ดวงยังไม่พร้อม ลองใหม่อีกครั้งในอีกสักครู่นะ" }, { status: 503 });
    }
    return NextResponse.json(
      { kind, sign, periodLabel: period.label, content },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ error: "ดูดวงไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 500 });
  }
}

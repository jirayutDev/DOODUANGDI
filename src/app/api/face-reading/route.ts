import { NextRequest, NextResponse } from "next/server";
import { generateFaceReading } from "@/lib/mu-ai";

// รับเฉพาะรูปที่ฝั่ง client ย่อมาแล้ว (ประมาณ 768px) — กันคนยิงไฟล์ใหญ่มาเปลืองค่า AI
const MAX_DATA_URL_LENGTH = 1_500_000; // ~1.1MB หลัง decode base64
const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

// จำกัดความถี่แบบง่ายในหน่วยความจำ (ต่อ IP) เพราะโมเดลอ่านรูปมีค่าใช้จ่ายต่อครั้ง
// หมายเหตุ: ถ้า deploy หลาย instance ควรย้ายไปเก็บใน DB/Redis แทน
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "สแกนถี่ไปนิดนะ พักสัก 10 นาทีแล้วค่อยลองใหม่น้า" },
      { status: 429 }
    );
  }

  let body: { image?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image : "";
  if (!image || image.length > MAX_DATA_URL_LENGTH || !DATA_URL_PATTERN.test(image)) {
    return NextResponse.json(
      { error: "รูปไม่ถูกต้องหรือใหญ่เกินไป ลองถ่ายหรือเลือกรูปใหม่อีกครั้งนะ" },
      { status: 400 }
    );
  }

  // ไม่บันทึกรูปลง DB/storage — ส่งให้ AI อ่านแล้วทิ้งทันที
  const outcome = await generateFaceReading(image);

  if (!outcome.ok && outcome.reason === "no_face") {
    return NextResponse.json(
      { error: "น้องมูหาใบหน้าในรูปไม่เจอ ลองถ่ายหน้าตรง เห็นหน้าคนเดียวชัดๆ ในที่แสงสว่างอีกทีนะ" },
      { status: 422 }
    );
  }
  if (!outcome.ok) {
    return NextResponse.json(
      { error: "ตอนนี้น้องมูอ่านโหงวเฮ้งไม่ได้ชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่นะ" },
      { status: 503 }
    );
  }

  return NextResponse.json({ result: outcome.result });
}

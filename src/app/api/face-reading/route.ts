import { NextRequest, NextResponse } from "next/server";
import { generateFaceReading } from "@/lib/mu-ai";
import { chargeFeature } from "@/lib/coins";
import { rateLimit } from "@/lib/rate-limit";

// รับเฉพาะรูปที่ฝั่ง client ย่อมาแล้ว (ประมาณ 768px) — กันคนยิงไฟล์ใหญ่มาเปลืองค่า AI
const MAX_DATA_URL_LENGTH = 1_500_000; // ~1.1MB หลัง decode base64
const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(req: NextRequest) {
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
  const charge = await chargeFeature("face-reading");
  if (!charge.ok) return charge.res;

  if (!(await rateLimit(`face:${charge.userId}`, 10, 60 * 60 * 1000))) {
    await charge.refund();
    return NextResponse.json(
      { error: "สแกนถี่ไปนิดนะ พักสักครู่แล้วค่อยลองใหม่น้า" },
      { status: 429 }
    );
  }

  let outcome: Awaited<ReturnType<typeof generateFaceReading>>;
  try {
    outcome = await generateFaceReading(image, charge.userId);
  } catch {
    await charge.refund();
    return NextResponse.json({ error: "อ่านโหงวเฮ้งไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 503 });
  }
  // no_face นับเป็นการใช้งานที่คิดเงิน (เรียกโมเดลแล้ว) — คืนเหรียญเฉพาะเมื่อ provider ใช้ไม่ได้
  if (!outcome.ok && outcome.reason !== "no_face") await charge.refund();

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

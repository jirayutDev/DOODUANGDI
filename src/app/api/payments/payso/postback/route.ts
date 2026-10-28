import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { isPaysoConfigured, isPaysoRef, settlePaysoPayment } from "@/lib/payso";

// Payso ส่ง POST (form-urlencoded) มาที่นี่เมื่อชำระแล้ว แต่ postback ไม่มี signature
// จึงไม่เชื่อข้อมูลในคำขอเลย: ใช้แค่ refno ไปค้นรายการของเรา แล้วให้ settlePaysoPayment เช็กกับ Payso ซ้ำ
export async function POST(req: NextRequest) {
  if (!isPaysoConfigured()) return new NextResponse("not configured", { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(`payso-postback:${ip}`, 60, 60 * 1000))) {
    return new NextResponse("too many requests", { status: 429 });
  }

  let refno: unknown;
  try {
    refno = (await req.formData()).get("refno");
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }
  if (!isPaysoRef(refno)) return new NextResponse("OK");

  const [payment] = await getDb().select().from(payments).where(eq(payments.promptpayRef, refno)).limit(1);
  if (!payment) return new NextResponse("OK");

  try {
    await settlePaysoPayment(payment);
  } catch (e) {
    // เรียก Payso ไม่ได้ชั่วคราว -> ตอบ 500 ให้ลองใหม่ได้ (ถ้า Payso ลองซ้ำ) และหน้าเว็บก็โพลสถานะเองอยู่แล้ว
    console.error("[payso] postback settle failed", e instanceof Error ? e.message : e);
    return new NextResponse("error", { status: 500 });
  }
  return new NextResponse("OK");
}

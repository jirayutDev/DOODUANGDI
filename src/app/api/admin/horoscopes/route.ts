import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { generateAllSigns, generateSign, isZodiacSign } from "@/lib/horoscopes";
import { rateLimit } from "@/lib/rate-limit";
import { getLastAiFailures } from "@/lib/mu-ai";
import { aiStatus } from "@/lib/ai-provider";

export const maxDuration = 60;

const schema = z.object({
  kind: z.enum(["daily", "weekly", "monthly"]),
  regenerate: z.boolean().default(false),
  // ระบุราศี = สร้างราศีเดียว (หน้าแอดมินวนเรียกทีละราศี เพราะโฮสต์จำกัดเวลาฟังก์ชันสั้น สร้างทั้ง 12 ราศีในคำขอเดียวไม่ทัน)
  sign: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { kind, regenerate, sign } = parsed.data;
  if (sign !== undefined && !isZodiacSign(sign)) return NextResponse.json({ error: "ไม่รู้จักราศีนี้" }, { status: 400 });

  // จำกัดความถี่กัน AI ถูกเรียกรัว (ราศีเดียวนับ 1 ครั้ง สร้างครบ 12 ราศีหลายรอบต่อชั่วโมงได้)
  if (!(await rateLimit("admin-horoscopes", 150, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "สั่งถี่เกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  }

  try {
    if (sign) {
      const r = await generateSign(kind, sign, { regenerate });
      // คำใบ้เมื่อสร้างไม่สำเร็จ (รายละเอียดจริงดูใน log ของเซิร์ฟเวอร์ ค้นคำว่า [ai])
      const hint =
        r.status === "failed"
          ? aiStatus().keyConfigured
            ? "โมเดล AI ไม่ตอบหรือใช้เวลานานเกินกำหนด ลองตั้ง AI_MODEL เป็นโมเดลที่เร็ว"
            : "ยังไม่ได้ตั้ง AI_API_KEY (หรือ OPENROUTER_API_KEY) บนเซิร์ฟเวอร์"
          : undefined;
      return NextResponse.json({ ...r, hint, reasons: r.status === "failed" ? getLastAiFailures() : undefined });
    }
    const result = await generateAllSigns(kind, { regenerate });
    return NextResponse.json(result, { status: result.failed.length ? 207 : 200 });
  } catch (e) {
    // ไม่ปล่อยให้เป็น 500 ว่างๆ: บันทึกสาเหตุไว้ใน log ของโฮสต์ และตอบข้อความที่หน้าแอดมินแสดงได้
    console.error("[admin/horoscopes] failed", kind, sign ?? "(all)", e instanceof Error ? `${e.name}: ${e.message}` : e);
    return NextResponse.json({ error: "สร้างดวงไม่สำเร็จ (ดูรายละเอียดใน log ของเซิร์ฟเวอร์)" }, { status: 500 });
  }
}

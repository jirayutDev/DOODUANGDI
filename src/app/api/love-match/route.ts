import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chargeFeature } from "@/lib/coins";
import { generateLoveMatch, isCrisisMessage, isValidBirthDate, LOVE_GENDERS } from "@/lib/mu-ai";
import { rateLimit } from "@/lib/rate-limit";

const personSchema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: z.string().refine(isValidBirthDate),
  gender: z.enum(LOVE_GENDERS),
});

const bodySchema = z.object({ you: personSchema, partner: personSchema });

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ครบหรือไม่ถูกต้อง ตรวจชื่อ วันเกิด และเพศของทั้งสองคนอีกครั้งนะ" },
      { status: 400 }
    );
  }
  const { you, partner } = parsed.data;

  if (isCrisisMessage(you.name) || isCrisisMessage(partner.name)) {
    return NextResponse.json({ error: "กรุณากรอกชื่อจริงหรือชื่อเล่นของทั้งสองคนนะ" }, { status: 400 });
  }

  // ไม่บันทึกข้อมูลของทั้งสองคนลง DB — ส่งให้ AI แล้วทิ้งทันที
  const charge = await chargeFeature("love-match");
  if (!charge.ok) return charge.res;

  if (!(await rateLimit(`love:${charge.userId}`, 20, 60 * 60 * 1000))) {
    await charge.refund();
    return NextResponse.json({ error: "ทำนายถี่ไปนิดนะ พักสักครู่แล้วค่อยลองใหม่น้า" }, { status: 429 });
  }

  let result: Awaited<ReturnType<typeof generateLoveMatch>>;
  try {
    result = await generateLoveMatch(you, partner, charge.userId);
  } catch {
    result = null;
  }
  if (!result) {
    await charge.refund();
    return NextResponse.json({ error: "ทำนายไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 503 });
  }
  return NextResponse.json({ result });
}

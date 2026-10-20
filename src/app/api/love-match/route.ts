import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLoveMatch, isCrisisMessage, LOVE_GENDERS } from "@/lib/mu-ai";

// จำกัดความถี่แบบง่ายในหน่วยความจำ (ต่อ IP) เพราะเรียก AI ทุกครั้ง
// หมายเหตุ: ถ้า deploy หลาย instance ควรย้ายไปเก็บใน DB/Redis แทน
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
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

const personSchema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d <= new Date() && d.getFullYear() >= 1900;
    }),
  gender: z.enum(LOVE_GENDERS),
});

const bodySchema = z.object({ you: personSchema, partner: personSchema });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "ทำนายถี่ไปนิดนะ พักสัก 10 นาทีแล้วค่อยลองใหม่น้า" },
      { status: 429 }
    );
  }

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
  const result = await generateLoveMatch(you, partner);
  return NextResponse.json({ result });
}

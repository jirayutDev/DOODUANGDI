import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chargeFeature } from "@/lib/coins";
import { PERSONALITY_CATEGORIES } from "@/lib/personality-content";

const Body = z.object({
  category: z.enum(["zodiac", "nakshatra", "day"]),
  key: z.string().min(1).max(40),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const { category, key } = parsed.data;
  const data = PERSONALITY_CATEGORIES[category].data;
  if (!Object.prototype.hasOwnProperty.call(data, key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  const charge = await chargeFeature("personality");
  if (!charge.ok) return charge.res;
  try {
    return NextResponse.json({ result: { key, text: data[key] } });
  } catch {
    await charge.refund();
    return NextResponse.json({ error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { generateAllSigns } from "@/lib/horoscopes";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const schema = z.object({ kind: z.enum(["daily", "weekly", "monthly"]), regenerate: z.boolean().default(false) });

// แอดมินสั่งสร้างดวงของช่วงปัจจุบัน (เติมที่ขาด หรือลบแล้วสร้างใหม่ทั้งช่วง) — เรียก AI ทุกราศี จึงจำกัดความถี่
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  if (!(await rateLimit("admin-horoscopes", 6, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "สั่งถี่เกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  }
  const result = await generateAllSigns(parsed.data.kind, { regenerate: parsed.data.regenerate });
  return NextResponse.json(result, { status: result.failed.length ? 207 : 200 });
}

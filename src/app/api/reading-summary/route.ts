import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chargeFeature } from "@/lib/coins";
import { getTarotCardBySlug } from "@/lib/tarot-data";
import { generateSpreadSummary, isCrisisMessage, CRISIS_REPLY } from "@/lib/mu-ai";

const bodySchema = z.object({
  spreadName: z.string().trim().min(1).max(60),
  question: z.string().max(300).optional(),
  results: z
    .array(
      z.object({
        position: z.string().max(40),
        slug: z.string().max(60),
        reversed: z.boolean().optional(),
      })
    )
    .min(1)
    .max(12),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const question = body.question?.trim() || undefined;

  if (question && isCrisisMessage(question)) {
    return NextResponse.json({ summary: CRISIS_REPLY });
  }

  // ยึดข้อมูลไพ่จาก slug ฝั่ง server เท่านั้น กันไคลเอนต์ยัดความหมายปลอมมาเอง
  const results = body.results
    .map((r) => {
      const card = getTarotCardBySlug(r.slug);
      if (!card) return null;
      // กันไว้อีกชั้น: ไพ่ชุดใหญ่ (ภาพองค์เทพ) ห้ามกลับหัวไม่ว่า client จะส่งค่าอะไรมา
      return { position: r.position, card, reversed: card.isMajor ? false : (r.reversed ?? false) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (results.length === 0) {
    return NextResponse.json({ error: "no valid cards" }, { status: 400 });
  }

  const charge = await chargeFeature("reading-summary");
  if (!charge.ok) return charge.res;

  let summary: string | null;
  try {
    summary = await generateSpreadSummary({ spreadName: body.spreadName, question, results });
  } catch {
    summary = null;
  }
  if (!summary) {
    await charge.refund();
    return NextResponse.json({ error: "สรุปผลไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 503 });
  }
  return NextResponse.json({ summary });
}

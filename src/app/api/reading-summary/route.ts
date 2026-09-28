import { NextRequest, NextResponse } from "next/server";
import { getTarotCardBySlug } from "@/lib/tarot-data";
import { generateSpreadSummary, isCrisisMessage, CRISIS_REPLY } from "@/lib/mu-ai";

interface ReadingSummaryBody {
  spreadName: string;
  question?: string;
  results: { position: string; slug: string; reversed: boolean }[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ReadingSummaryBody;

  if (!body.spreadName || !Array.isArray(body.results) || body.results.length === 0) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

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
      return { position: r.position, card, reversed: card.isMajor ? false : r.reversed };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (results.length === 0) {
    return NextResponse.json({ error: "no valid cards" }, { status: 400 });
  }

  const summary = await generateSpreadSummary({
    spreadName: body.spreadName,
    question,
    results,
  });

  return NextResponse.json({ summary });
}

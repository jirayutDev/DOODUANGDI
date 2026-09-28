import { NextRequest, NextResponse } from "next/server";
import { generateTopicReading, isCrisisMessage, CRISIS_REPLY } from "@/lib/mu-ai";
import type { BirthProfile } from "@/lib/astrology";

interface TopicConfig {
  topicName: string;
  timeframe: string;
  extraRule?: string;
  needsPartnerZodiac?: boolean;
}

// นิยามหัวข้อฝั่ง server เท่านั้น กัน client ยัดคำสั่งปลอมมาหลอก AI
const TOPICS: Record<string, TopicConfig> = {
  weekly: { topicName: "ดวงรายสัปดาห์", timeframe: "สัปดาห์นี้" },
  biweekly: { topicName: "ดวงรายปักษ์", timeframe: "ช่วง 15 วันนี้" },
  monthly: { topicName: "ดวงรายเดือน", timeframe: "เดือนนี้" },
  "half-year-2569": { topicName: "ดวงภาพรวม", timeframe: "ครึ่งปีหลัง 2569" },
  "year-2569": { topicName: "ดวงภาพรวม", timeframe: "ตลอดปี 2569" },
  "chinese-year-2569": { topicName: "ดวงจีนตามปีนักษัตร", timeframe: "ปี 2569" },
  "love-daily": { topicName: "ดวงความรัก", timeframe: "วันนี้" },
  "love-monthly": { topicName: "ดวงความรัก", timeframe: "เดือนนี้" },
  career: { topicName: "ดวงการงาน", timeframe: "ช่วงนี้" },
  money: { topicName: "ดวงการเงิน", timeframe: "ช่วงนี้" },
  study: {
    topicName: "ดวงการเรียน",
    timeframe: "ช่วงนี้",
    extraRule: "ห้ามการันตีผลสอบหรือผลลัพธ์ ให้เป็นคำแนะนำเชิงเตรียมตัวและทัศนคติแทน",
  },
  family: { topicName: "ดวงครอบครัวและบริวาร", timeframe: "ช่วงนี้" },
  fortune: {
    topicName: "ดวงโชคลาภ",
    timeframe: "ช่วงนี้",
    extraRule: "ห้ามให้ตัวเลขใดๆ ทั้งสิ้น (ไม่ทำนายหวย) ให้พูดถึงพลังงานโชคเชิงคุณภาพเท่านั้น",
  },
  compatibility: { topicName: "ดวงสมพงศ์เนื้อคู่", timeframe: "ตอนนี้", needsPartnerZodiac: true },
  "life-graph": { topicName: "กราฟชีวิตภาพรวม", timeframe: "ช่วงนี้ถึงอนาคตอันใกล้" },
};

interface Body {
  slug?: string;
  profile?: (BirthProfile & { birthDate: string }) | null;
  partnerZodiac?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const config = body.slug ? TOPICS[body.slug] : undefined;
  if (!config) {
    return NextResponse.json({ error: "ไม่พบหัวข้อนี้" }, { status: 400 });
  }

  if (config.needsPartnerZodiac && body.partnerZodiac && isCrisisMessage(body.partnerZodiac)) {
    return NextResponse.json({ reading: CRISIS_REPLY });
  }

  // ไม่มีวันเกิดจริง = ไม่มีข้อมูลให้ทำนาย ปฏิเสธแทนที่จะให้ AI เดามั่วๆ
  if (!body.profile?.birthDate) {
    return NextResponse.json(
      { error: "ต้องกรอกวันเกิดที่หน้าดวงโปรไฟล์ก่อนถึงจะดูดวงเรื่องนี้ได้" },
      { status: 400 }
    );
  }

  const reading = await generateTopicReading({
    topicName: config.topicName,
    timeframe: config.timeframe,
    profile: body.profile ?? null,
    partnerZodiac: config.needsPartnerZodiac ? body.partnerZodiac : undefined,
    extraRule: config.extraRule,
  });

  return NextResponse.json({ reading, topicName: config.topicName, timeframe: config.timeframe });
}

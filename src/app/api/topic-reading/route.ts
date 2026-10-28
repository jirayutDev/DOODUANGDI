import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTopicReading, isCrisisMessage, isValidBirthDate, serverProfile, CRISIS_REPLY } from "@/lib/mu-ai";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { chargeFeature } from "@/lib/coins";

interface TopicConfig {
  topicName: string;
  timeframe: string;
  extraRule?: string;
  needsPartnerZodiac?: boolean;
}

// นิยามหัวข้อฝั่ง server เท่านั้น กัน client ยัดคำสั่งปลอมมาหลอก AI
// weekly/monthly ให้บริการฟรีผ่าน /api/horoscope (แคช) จึงไม่อยู่ที่นี่
const TOPICS: Record<string, TopicConfig> = {
  biweekly: { topicName: "ดวงรายปักษ์", timeframe: "ช่วง 15 วันนี้" },
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

const bodySchema = z.object({
  slug: z.string().max(40),
  // รับเฉพาะ birthDate แล้วคำนวณโปรไฟล์ใหม่ฝั่ง server (field อื่นรวม birthTime/province ถูกทิ้ง)
  profile: z.object({ birthDate: z.string().max(10) }).nullish(),
  partnerZodiac: z.string().max(20).optional(),
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

  if (body.slug === "weekly" || body.slug === "monthly") {
    return NextResponse.json({ error: "ใช้ /api/horoscope" }, { status: 400 });
  }
  if (!Object.hasOwn(TOPICS, body.slug)) {
    return NextResponse.json({ error: "ไม่พบหัวข้อนี้" }, { status: 400 });
  }
  const config = TOPICS[body.slug];

  let partnerZodiac: string | undefined;
  if (config.needsPartnerZodiac && body.partnerZodiac) {
    if (isCrisisMessage(body.partnerZodiac)) {
      return NextResponse.json({ reading: CRISIS_REPLY });
    }
    if (!ZODIAC_SIGN_NAMES.includes(body.partnerZodiac)) {
      return NextResponse.json({ error: "ราศีไม่ถูกต้อง" }, { status: 400 });
    }
    partnerZodiac = body.partnerZodiac;
  }

  // ไม่มีวันเกิดจริง = ไม่มีข้อมูลให้ทำนาย ปฏิเสธแทนที่จะให้ AI เดามั่วๆ
  const birthDate = body.profile?.birthDate;
  if (!birthDate || !isValidBirthDate(birthDate)) {
    return NextResponse.json(
      { error: "ต้องกรอกวันเกิดที่หน้าดวงโปรไฟล์ก่อนถึงจะดูดวงเรื่องนี้ได้" },
      { status: 400 }
    );
  }
  const profile = serverProfile(birthDate);

  const charge = await chargeFeature("topic-reading");
  if (!charge.ok) return charge.res;

  let reading: string | null;
  try {
    reading = await generateTopicReading(
      {
        topicName: config.topicName,
        timeframe: config.timeframe,
        profile,
        partnerZodiac,
        extraRule: config.extraRule,
      },
      charge.userId
    );
  } catch {
    reading = null;
  }
  if (!reading) {
    await charge.refund();
    return NextResponse.json({ error: "ดูดวงไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 503 });
  }
  return NextResponse.json({ reading, topicName: config.topicName, timeframe: config.timeframe });
}

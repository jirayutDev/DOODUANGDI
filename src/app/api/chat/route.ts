import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { TAROT_CARDS } from "@/lib/tarot-data";
import { generateMuReply, isCrisisMessage, serverProfile, CRISIS_REPLY } from "@/lib/mu-ai";
import { chargeFeature, getBalance } from "@/lib/coins";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
  // รับเฉพาะ birthDate แล้วคำนวณโปรไฟล์ใหม่ฝั่ง server (field อื่นถูกทิ้ง)
  profile: z.object({ birthDate: z.string().max(10) }).nullish(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(500) }))
    .max(6)
    .optional(),
});

// แชทน้องมู: ล็อกอิน + เป็นสมาชิก + จ่าย coin ต่อข้อ (แทนโควตา 3 ข้อ/วันแบบเดิม)
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  const { message } = parsed.data;
  const history = parsed.data.history ?? [];

  // ข้อความวิกฤตตอบทันทีโดยไม่คิด coin เพื่อให้ได้รับข้อมูลช่วยเหลือเสมอ (ตรวจประวัติฝั่งผู้ใช้ด้วย)
  if (isCrisisMessage(message) || history.some((h) => h.role === "user" && isCrisisMessage(h.content))) {
    return NextResponse.json({ reply: CRISIS_REPLY, card: null });
  }

  const profile = parsed.data.profile ? serverProfile(parsed.data.profile.birthDate) : null;

  const charge = await chargeFeature("chat");
  if (!charge.ok) return charge.res;

  const today = new Date().toISOString().slice(0, 10);
  const card = TAROT_CARDS[(today.length + message.length) % TAROT_CARDS.length];

  let reply: string | null;
  try {
    reply = await generateMuReply({ message, profile, card, history });
  } catch {
    reply = null;
  }
  if (!reply) {
    await charge.refund();
    return NextResponse.json({ error: "น้องมูตอบไม่ได้ชั่วคราว ลองใหม่อีกครั้งนะ" }, { status: 503 });
  }

  try {
    await getDb().insert(chatMessages).values([
      { userId: charge.userId, role: "user", content: message },
      { userId: charge.userId, role: "assistant", content: reply },
    ]);
  } catch {
    // บันทึกไม่สำเร็จก็ยังตอบผู้ใช้ได้ตามปกติ
  }

  return NextResponse.json({ reply, card, cost: charge.cost, balance: await getBalance(charge.userId) });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { TAROT_CARDS } from "@/lib/tarot-data";
import { generateMuReply, isCrisisMessage, CRISIS_REPLY } from "@/lib/mu-ai";
import type { BirthProfile } from "@/lib/astrology";

const DAILY_QUOTA = 3;

interface ChatRequestBody {
  message: string;
  profile?: (BirthProfile & { birthDate: string }) | null;
  history?: { role: "user" | "assistant"; content: string }[];
  clientQuotaUsed?: number; // fallback นับที่ฝั่ง client เมื่อยังไม่ได้ล็อกอิน
}

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequestBody;
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (isCrisisMessage(message)) {
    return NextResponse.json({
      reply: CRISIS_REPLY,
      card: null,
      quotaUsed: body.clientQuotaUsed ?? 0,
      quotaLimit: DAILY_QUOTA,
    });
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ยังไม่ได้ตั้งค่า Supabase env — ทำงานแบบ anonymous ต่อ
  }

  // นับโควตาวันนี้: ใช้ DB จริงถ้าล็อกอินและต่อ Supabase แล้ว ไม่งั้นเชื่อตัวนับจาก client
  let quotaUsed = body.clientQuotaUsed ?? 0;
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  if (userId) {
    try {
      db = getDb();
      const rows = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.role, "user"),
            gte(chatMessages.createdAt, startOfTodayUtc())
          )
        );
      quotaUsed = rows.length;
    } catch {
      db = null;
    }
  }

  if (quotaUsed >= DAILY_QUOTA) {
    return NextResponse.json({
      reply:
        "วันนี้ถามน้องมูครบ 3 ข้อแล้วนะ พักไว้ก่อน พรุ่งนี้มาถามต่อได้ หรือสมัคร AI Plus เพื่อคุยไม่จำกัดข้อ",
      card: null,
      quotaUsed,
      quotaLimit: DAILY_QUOTA,
      limitReached: true,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const card = TAROT_CARDS[(today.length + message.length) % TAROT_CARDS.length];

  const reply = await generateMuReply({
    message,
    profile: body.profile ?? null,
    card,
    history: body.history ?? [],
  });

  if (userId && db) {
    try {
      await db.insert(chatMessages).values([
        { userId, role: "user", content: message },
        { userId, role: "assistant", content: reply },
      ]);
    } catch {
      // บันทึกไม่สำเร็จก็ยังตอบผู้ใช้ได้ตามปกติ
    }
  }

  return NextResponse.json({
    reply,
    card,
    quotaUsed: quotaUsed + 1,
    quotaLimit: DAILY_QUOTA,
  });
}

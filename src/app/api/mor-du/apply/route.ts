import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";

const applySchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  bio: z.string().trim().min(1).max(1000),
  specialties: z.string().trim().min(1).max(200),
  priceQuestion: z.number().int().min(0).max(100000),
  priceLiveMinute: z.number().int().min(0).max(100000).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  if (!(await rateLimit(`apply:${user.id}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "กรอกข้อมูลให้ครบและถูกต้อง" }, { status: 400 });
  }
  const body = parsed.data;

  const db = getDb();
  const [existing] = await db
    .select({ status: morDus.status })
    .from(morDus)
    .where(eq(morDus.userId, user.id))
    .limit(1);

  if (existing?.status === "suspended") {
    return NextResponse.json({ error: "บัญชีหมอดูของคุณถูกระงับ ไม่สามารถแก้ไขหรือสมัครใหม่ได้" }, { status: 403 });
  }

  if (existing?.status === "rejected") {
    return NextResponse.json({ error: "คำขอของคุณถูกปฏิเสธ กรุณาติดต่อแอดมิน" }, { status: 403 });
  }

  const fields = {
    displayName: body.displayName,
    bio: body.bio,
    specialties: body.specialties,
    priceQuestion: body.priceQuestion,
    priceLiveMinute: body.priceLiveMinute || null,
  };

  // approved/pending -> pending; rejected/suspended ไม่ถูกรีเซ็ตสถานะ
  // เช็กสถานะซ้ำใน WHERE เพื่อกัน race กับแอดมินที่เพิ่งระงับ/ปฏิเสธ
  await db
    .insert(morDus)
    .values({ userId: user.id, ...fields, status: "pending" })
    .onConflictDoUpdate({
      target: morDus.userId,
      set: { ...fields, status: "pending", updatedAt: new Date() },
      setWhere: sql`${morDus.status} in ('pending', 'approved')`,
    });

  return NextResponse.json({ ok: true });
}

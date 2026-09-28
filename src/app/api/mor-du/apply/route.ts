import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";

interface ApplyBody {
  displayName: string;
  bio: string;
  specialties: string;
  priceQuestion: number;
  priceLiveMinute?: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = (await req.json()) as ApplyBody;
  if (!body.displayName?.trim() || !body.bio?.trim() || !body.specialties?.trim() || !body.priceQuestion) {
    return NextResponse.json({ error: "กรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const db = getDb();
  await db
    .insert(morDus)
    .values({
      userId: user.id,
      displayName: body.displayName.trim(),
      bio: body.bio.trim(),
      specialties: body.specialties.trim(),
      priceQuestion: body.priceQuestion,
      priceLiveMinute: body.priceLiveMinute || null,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: morDus.userId,
      set: {
        displayName: body.displayName.trim(),
        bio: body.bio.trim(),
        specialties: body.specialties.trim(),
        priceQuestion: body.priceQuestion,
        priceLiveMinute: body.priceLiveMinute || null,
        status: "pending",
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}

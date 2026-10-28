import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["approve", "reject", "suspend"]),
});

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { userId, action } = parsed.data;

  const db = getDb();
  await db
    .update(morDus)
    .set({
      status: action === "approve" ? "approved" : action === "suspend" ? "suspended" : "rejected",
      updatedAt: new Date(),
    })
    .where(eq(morDus.userId, userId));

  return NextResponse.json({ ok: true });
}

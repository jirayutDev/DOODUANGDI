import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin";
import { getDb } from "@/db";
import { payments } from "@/db/schema";

const Body = z.object({ paymentId: z.string().uuid() });

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
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const updated = await getDb()
    .update(payments)
    .set({ status: "rejected" })
    .where(and(eq(payments.id, parsed.data.paymentId), inArray(payments.status, ["pending", "awaiting_confirmation"])))
    .returning({ id: payments.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "ไม่พบรายการ หรือสถานะเปลี่ยนไปแล้ว" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

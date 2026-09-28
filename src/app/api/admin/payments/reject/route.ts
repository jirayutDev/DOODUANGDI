import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json()) as { paymentId?: string };
  if (!body.paymentId) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const db = getDb();
  await db.update(payments).set({ status: "rejected" }).where(eq(payments.id, body.paymentId));

  return NextResponse.json({ ok: true });
}

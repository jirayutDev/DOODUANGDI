import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { isPaysoConfigured, settlePaysoPayment } from "@/lib/payso";

// หน้าเติม coin โพลที่นี่ระหว่างรอลูกค้าสแกนจ่าย: ถ้ายัง pending จะถาม Payso ตรง ๆ
// (ไม่ต้องรอ postback จึงใช้ได้แม้ postback ตกหล่น)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

  const id = z.string().uuid().safeParse(req.nextUrl.searchParams.get("paymentId"));
  if (!id.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const db = getDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, id.data), eq(payments.userId, user.id)))
    .limit(1);
  if (!payment) return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });

  if (payment.status === "pending" && isPaysoConfigured()) {
    if (!(await rateLimit(`payso-poll:${user.id}`, 30, 60 * 1000))) {
      return NextResponse.json({ status: payment.status });
    }
    try {
      await settlePaysoPayment(payment);
    } catch {
      return NextResponse.json({ status: payment.status });
    }
    const [fresh] = await db.select({ status: payments.status }).from(payments).where(eq(payments.id, payment.id)).limit(1);
    return NextResponse.json({ status: fresh?.status ?? payment.status });
  }
  return NextResponse.json({ status: payment.status });
}

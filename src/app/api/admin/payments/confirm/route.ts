import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { fulfillPayment } from "@/lib/payments";

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

  const result = await fulfillPayment(parsed.data.paymentId);
  if (result === "not_found") return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  if (result === "rejected") {
    return NextResponse.json({ error: "รายการนี้ถูกปฏิเสธไปแล้ว ยืนยันไม่ได้" }, { status: 409 });
  }
  if (result === "slip_used") return NextResponse.json({ error: "สลิปนี้ถูกใช้ไปแล้ว" }, { status: 409 });
  return NextResponse.json({ ok: true, alreadyConfirmed: result === "already_confirmed" });
}

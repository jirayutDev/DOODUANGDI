import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { isSmsKubConfigured, sendSms, toThaiLocalPhone } from "@/lib/smskub";
import { verifyHookSignature } from "@/lib/supabase-hook";

// Supabase "Send SMS Hook": Supabase สร้างรหัส OTP เอง แล้วเรียกที่นี่ให้เราส่ง SMS ผ่าน SMSKUB
// ตั้งใน Supabase > Authentication > Hooks > Send SMS (HTTPS) ใส่ URL นี้ และคัดลอก secret ที่ได้มาเป็น SEND_SMS_HOOK_SECRET
const bodySchema = z.object({
  user: z.object({ phone: z.string().min(8).max(20) }),
  sms: z.object({ otp: z.string().regex(/^\d{4,10}$/) }),
});

function hookError(status: number, message: string) {
  // รูปแบบ error ที่ Supabase Auth hook อ่านได้ (ข้อความจะส่งต่อให้ผู้ใช้เห็น จึงใช้ข้อความทั่วไป)
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret || !isSmsKubConfigured()) return hookError(503, "ระบบส่ง SMS ยังไม่พร้อมใช้งาน");

  const raw = await req.text();
  const ok = verifyHookSignature(
    raw,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    secret
  );
  if (!ok) return new NextResponse(null, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(raw));
  } catch {
    return hookError(400, "ข้อมูลไม่ถูกต้อง");
  }
  if (!parsed.success) return hookError(400, "ข้อมูลไม่ถูกต้อง");

  const phone = toThaiLocalPhone(parsed.data.user.phone);
  if (!phone) return hookError(400, "รองรับเฉพาะเบอร์มือถือไทย");

  // กันถูกใช้ยิง SMS รัวๆ (ค่าใช้จ่ายเราเอง): ต่อเบอร์ 3 ครั้ง/10 นาที และ 10 ครั้ง/วัน รวมทั้งระบบ 300 ครั้ง/ชั่วโมง
  const withinLimits =
    (await rateLimit(`sms:${phone}:10m`, 3, 10 * 60 * 1000)) &&
    (await rateLimit(`sms:${phone}:1d`, 10, 24 * 60 * 60 * 1000)) &&
    (await rateLimit("sms:all:1h", 300, 60 * 60 * 1000));
  if (!withinLimits) return hookError(429, "ขอรหัสถี่เกินไป รอสักครู่แล้วลองใหม่");

  // ข้อความอังกฤษล้วนเพื่อให้คิดเครดิตแค่ 1 ข้อความ (ภาษาไทยเป็น Unicode ยาวได้น้อยกว่าและแพงกว่า)
  const sent = await sendSms(phone, `DooDuangDi OTP: ${parsed.data.sms.otp} (do not share this code)`);
  if (!sent) return hookError(502, "ส่ง SMS ไม่สำเร็จ ลองใหม่อีกครั้ง");

  return NextResponse.json({});
}

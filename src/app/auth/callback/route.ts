import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "magiclink", "recovery", "invite", "email_change", "email"];

// ปลายทางที่ Supabase redirect กลับมาหลัง OAuth (Google/LINE) หรือคลิกลิงก์ในอีเมล
// - ?code=...              : PKCE (OAuth, หรือลิงก์อีเมลที่เปิดในเบราว์เซอร์เดียวกับที่ขอ)
// - ?token_hash=...&type=  : ลิงก์อีเมลแบบไม่ผูกเบราว์เซอร์ (เปิดจากแอปเมลบนมือถือได้) ต้องตั้ง email template ให้ชี้มาที่นี่
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // ลิงก์รีเซ็ตรหัสผ่านต้องไปหน้าตั้งรหัสใหม่เสมอ
  const next = type === "recovery" ? "/auth/reset-password" : safeNext(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`);
}

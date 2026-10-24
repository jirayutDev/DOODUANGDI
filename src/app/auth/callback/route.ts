import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// อนุญาตเฉพาะ path ภายในเว็บเอง กัน open redirect (เช่น //evil.com, /\evil.com, https://evil.com)
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return value;
  }
  return "/profile";
}

// ปลายทางที่ Supabase redirect กลับมาหลัง OAuth (Google/LINE) หรือคลิก magic link
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`);
}

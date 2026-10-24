import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getBalance, redeemCode } from "@/lib/coins";

// ข้อความเดียวสำหรับทุกกรณีที่แลกไม่ได้ กันการเดาสถานะของโค้ด
const GENERIC_INVALID = "โค้ดไม่ถูกต้อง หมดอายุ หรือใช้ไม่ได้แล้ว";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน", code: "login_required" }, { status: 401 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const okUser = await rateLimit(`redeem:${user.id}`, 8, 10 * 60 * 1000);
  const okIp = await rateLimit(`redeem-ip:${ip}`, 30, 10 * 60 * 1000);
  if (!okUser || !okIp) {
    return NextResponse.json({ error: "ลองโค้ดถี่ไป พัก 10 นาทีแล้วลองใหม่นะ" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9-]{3,32}$/.test(code)) {
    return NextResponse.json({ error: GENERIC_INVALID }, { status: 400 });
  }

  try {
    const result = await redeemCode(user.id, code);
    if (!result.ok) return NextResponse.json({ error: GENERIC_INVALID }, { status: 400 });
    return NextResponse.json({ ok: true, coins: result.coins, balance: await getBalance(user.id) });
  } catch {
    return NextResponse.json({ error: "แลกโค้ดไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 500 });
  }
}

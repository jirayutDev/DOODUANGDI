import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { adminSlug } from "@/lib/admin-path";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createSessionToken,
  isAdminAuthConfigured,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

const schema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  if (!adminSlug() || !isAdminAuthConfigured()) return new NextResponse(null, { status: 404 });

  // กันเดารหัส: จำกัดต่อ IP และจำกัดรวมทั้งระบบ (กันกระจายหลาย IP)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const window = 15 * 60 * 1000;
  if (!(await rateLimit(`admin-login:${ip}`, 5, window)) || !(await rateLimit("admin-login:all", 50, window))) {
    return NextResponse.json({ error: "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
    return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return res;
}

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// ตรวจว่าเซิร์ฟเวอร์ต่อฐานข้อมูลได้ไหม (เปิด https://โดเมน/api/health) — ไม่เปิดเผยค่าลับ บอกแค่ผลและประเภทของปัญหา
// ใช้หาสาเหตุเว็บค้าง/504: ถ้า db ไม่ ok ให้ดู DATABASE_URL บนโฮสต์ (ต้องเป็น pooler พอร์ต 6543)
export const dynamic = "force-dynamic";

function classify(e: unknown): string {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const text = `${err?.code ?? ""} ${err?.cause?.code ?? ""} ${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
  if (/DATABASE_URL/.test(text)) return "DATABASE_URL ไม่ได้ตั้งค่า";
  if (/EMAXCONN/i.test(text)) return "connection เต็ม (ใช้พอร์ต 6543 Transaction pooler แทน 5432)";
  if (/ENOTFOUND|EAI_AGAIN/i.test(text)) return "หาโฮสต์ฐานข้อมูลไม่เจอ (ใช้สตริง pooler จากหน้า Connect ของ Supabase ไม่ใช่ db.xxx.supabase.co)";
  if (/ETIMEDOUT|CONNECT_TIMEOUT|timeout/i.test(text)) return "ต่อฐานข้อมูลหมดเวลา (เครือข่ายหรือโฮสต์ผิด)";
  if (/ECONNREFUSED/i.test(text)) return "ฐานข้อมูลปฏิเสธการเชื่อมต่อ (พอร์ตหรือโฮสต์ผิด)";
  if (/password|authentication|28P01|XX000|tenant or user not found/i.test(text)) return "ยืนยันตัวตนไม่ผ่าน (ชื่อผู้ใช้/รหัสผ่านผิด ผู้ใช้ pooler ต้องเป็น postgres.<รหัสโปรเจกต์>)";
  return "ต่อฐานข้อมูลไม่สำเร็จ (ดู log ของฟังก์ชัน)";
}

export async function GET() {
  const t0 = Date.now();
  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    // สถานะการตั้งค่า AI (ชื่อโมเดลไม่ใช่ความลับ ไม่เรียก AI จริงจึงไม่เสียเงิน)
    const models = [process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5", ...(process.env.OPENROUTER_FALLBACK_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean)];
    return NextResponse.json({ ok: true, db: "ok", ms: Date.now() - t0, ai: { keyConfigured: !!process.env.OPENROUTER_API_KEY, models } });
  } catch (e) {
    console.error("[health] db check failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, db: "error", reason: classify(e), ms: Date.now() - t0 }, { status: 503 });
  }
}

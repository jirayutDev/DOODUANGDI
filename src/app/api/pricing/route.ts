import { NextResponse } from "next/server";
import { getPricing } from "@/lib/pricing";

// ราคาปัจจุบัน (สาธารณะ ไม่ใช่ความลับ) หน้าเว็บดึงไปแสดงราคาแพ็กเกจและค่า coin ต่อบริการ
export async function GET() {
  const { costs, packages } = await getPricing();
  return NextResponse.json({ costs, packages }, { headers: { "cache-control": "public, max-age=0, s-maxage=30" } });
}

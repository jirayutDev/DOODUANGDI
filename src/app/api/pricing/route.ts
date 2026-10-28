import { NextResponse } from "next/server";
import { getPricing } from "@/lib/pricing";
import { isPromoLive } from "@/lib/coin-config";

// ราคาปัจจุบัน (สาธารณะ ไม่ใช่ความลับ) หน้าเว็บดึงไปแสดงราคาแพ็กเกจและค่า coin ต่อบริการ
export async function GET() {
  const { costs, packages, promotions } = await getPricing();
  // ส่งเฉพาะโปรที่ใช้งานอยู่ตอนนี้ (ไม่ส่งโปรที่ปิด/ยังไม่เริ่ม/หมดแล้ว)
  const live = promotions.filter((p) => isPromoLive(p));
  return NextResponse.json({ costs, packages, promotions: live }, { headers: { "cache-control": "public, max-age=0, s-maxage=30" } });
}

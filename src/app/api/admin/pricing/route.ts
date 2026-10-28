import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { getPricing, pricingSchema, savePricing } from "@/lib/pricing";
import type { Pricing } from "@/lib/coin-config";

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  return NextResponse.json(await getPricing());
}

// บันทึกราคาทั้งชุด (แพ็กเกจเติม coin + coin ต่อบริการ + coin ต้อนรับ) มีผลกับรายการที่สร้างหลังบันทึก
// รายการเติมเงินที่สร้างไปแล้วยึดยอดและ coin ตามที่บันทึกไว้ตอนสร้าง ไม่เปลี่ยนตาม
export async function PUT(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = pricingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  await savePricing(parsed.data as Pricing);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { chargeFeature } from "@/lib/coins";
import { drawSianSi } from "@/lib/sian-si";

export async function POST() {
  const charge = await chargeFeature("sian-si");
  if (!charge.ok) return charge.res;
  try {
    return NextResponse.json({ result: drawSianSi() });
  } catch {
    await charge.refund();
    return NextResponse.json({ error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ" }, { status: 500 });
  }
}

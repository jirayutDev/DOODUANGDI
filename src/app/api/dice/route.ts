import { NextResponse } from "next/server";
import { chargeFeature } from "@/lib/coins";
import { rollDice } from "@/lib/dice-fortune";

export async function POST() {
  const charge = await chargeFeature("dice");
  if (!charge.ok) return charge.res;
  try {
    return NextResponse.json({ result: rollDice() });
  } catch {
    await charge.refund();
    return NextResponse.json({ error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getThaiDayInfo } from "@/lib/astrology";
import { generateDayHoroscope } from "@/lib/mu-ai";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { day?: number };
  if (typeof body.day !== "number" || body.day < 0 || body.day > 6) {
    return NextResponse.json({ error: "invalid day" }, { status: 400 });
  }

  const { name, color } = getThaiDayInfo(body.day);
  const reading = await generateDayHoroscope(name, color);

  return NextResponse.json({ dayName: name, luckyColor: color, reading });
}

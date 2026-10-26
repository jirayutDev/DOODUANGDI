import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWelcomeCoins, getBalance } from "@/lib/coins";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ loggedIn: false, balance: 0 });

  try {
    await ensureWelcomeCoins(user.id).catch((e) => console.error("welcome coins failed", e instanceof Error ? e.message : "unknown"));
    return NextResponse.json({ loggedIn: true, balance: await getBalance(user.id) });
  } catch {
    return NextResponse.json({ loggedIn: true, balance: 0, error: "db_unavailable" });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance, hasActiveMembership } from "@/lib/coins";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ loggedIn: false, balance: 0, member: false });

  try {
    const [balance, member] = await Promise.all([getBalance(user.id), hasActiveMembership(user.id)]);
    return NextResponse.json({ loggedIn: true, balance, member });
  } catch {
    return NextResponse.json({ loggedIn: true, balance: 0, member: false, error: "db_unavailable" });
  }
}

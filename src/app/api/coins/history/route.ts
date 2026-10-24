import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { coinTransactions } from "@/db/schema";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน", code: "login_required" }, { status: 401 });

  const rows = await getDb()
    .select({
      id: coinTransactions.id,
      amount: coinTransactions.amount,
      kind: coinTransactions.kind,
      ref: coinTransactions.ref,
      createdAt: coinTransactions.createdAt,
    })
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, user.id))
    .orderBy(desc(coinTransactions.createdAt))
    .limit(30);

  return NextResponse.json({ items: rows });
}

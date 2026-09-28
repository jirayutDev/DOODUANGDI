import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { memberships, payments } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ membership: null, pendingPayment: null });
  }

  const db = getDb();

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  const [pendingPayment] = await db
    .select()
    .from(payments)
    .where(
      and(eq(payments.userId, user.id), inArray(payments.status, ["pending", "awaiting_confirmation"]))
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return NextResponse.json({
    membership: membership
      ? { plan: membership.plan, expiresAt: membership.expiresAt }
      : null,
    pendingPayment: pendingPayment
      ? { id: pendingPayment.id, status: pendingPayment.status, purpose: pendingPayment.purpose }
      : null,
  });
}

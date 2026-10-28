import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";

// ตัวช่วยร่วมของ API การจองคิวหมอดู
export async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

export async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export const idSchema = z.string().uuid();

export async function loadBooking(rawId: string) {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return null;
  const [b] = await getDb().select().from(bookings).where(eq(bookings.id, id.data)).limit(1);
  return b ?? null;
}

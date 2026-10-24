import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { getDb } from "@/db";
import { coinCodes } from "@/db/schema";

async function requireAdmin() {
  return (await getAdminUser()) !== null;
}

const createSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9-]{3,32}$/).optional(),
  coins: z.number().int().min(1).max(100000),
  maxUses: z.number().int().min(1).max(1000000).default(1),
  expiresAt: z.string().datetime().optional(),
});

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const rows = await getDb().select().from(coinCodes).orderBy(desc(coinCodes.createdAt)).limit(100);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const code = (parsed.data.code ?? randomCode()).toUpperCase();
  const inserted = await getDb()
    .insert(coinCodes)
    .values({
      code,
      coins: parsed.data.coins,
      maxUses: parsed.data.maxUses,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) return NextResponse.json({ error: "มีโค้ดนี้อยู่แล้ว" }, { status: 409 });
  return NextResponse.json({ ok: true, code });
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { loginHref } from "@/lib/safe-next";
import { BookForm } from "./book-form";

export const metadata = { title: "ขอคิวปรึกษาหมอดู · ดูดวงดิ" };

export default async function BookMorDuPage({ params }: { params: Promise<{ userId: string }> }) {
  const id = z.string().uuid().safeParse((await params).userId);
  if (!id.success) notFound();

  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) redirect(loginHref(`/mor-du/${id.data}/book`));

  const [m] = await getDb()
    .select()
    .from(morDus)
    .where(and(eq(morDus.userId, id.data), eq(morDus.status, "approved")))
    .limit(1);
  if (!m) notFound();

  return (
    <div className="mx-auto max-w-[640px] px-[18px] pb-12 pt-4 md:px-10 md:pt-8">
      <Link href="/mor-du" className="text-sm text-muted-foreground hover:text-foreground">
        ← กลับไปเลือกหมอดู
      </Link>
      <h1 className="mt-2 text-[28px] font-bold leading-[1.55] md:text-[36px]">ขอคิวปรึกษา {m.displayName}</h1>
      <p className="mt-1 text-soft-text">{m.specialties.split(",").map((s) => s.trim()).join(" · ")}</p>

      {!m.priceLiveMinute ? (
        <p className="mt-6 rounded-2xl border border-line-soft bg-card p-5 text-muted-foreground">หมอดูท่านนี้ยังไม่เปิดรับจองคิวปรึกษา</p>
      ) : (
        <BookForm morDuId={m.userId} perMinute={m.priceLiveMinute} />
      )}
    </div>
  );
}

import Link from "next/link";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MorDuList } from "./mor-du-list";

async function loadApprovedMorDus() {
  try {
    const db = getDb();
    return await db.select().from(morDus).where(eq(morDus.status, "approved"));
  } catch {
    return [];
  }
}

export default async function MorDuListPage() {
  const list = await loadApprovedMorDus();

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">หมอดูตัวจริง</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">เลือกหมอดู</h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        ทุกคนผ่านการตรวจสอบตามมาตรฐาน Safe Mu
      </p>

      {list.length === 0 ? (
        <div className="mt-[26px] rounded-2xl border border-line-soft bg-card py-10 text-center text-sm text-muted-foreground">
          ยังไม่มีหมอดูเปิดให้บริการตอนนี้ กลับมาเช็กใหม่เร็วๆ นี้นะ
        </div>
      ) : (
        <MorDuList
          list={list.map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            bio: m.bio,
            specialties: m.specialties,
            priceQuestion: m.priceQuestion,
            priceLiveMinute: m.priceLiveMinute ?? null,
          }))}
        />
      )}

      <div className="mt-7">
        <Link
          href="/mor-du/apply"
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:text-cream"
        >
          เป็นหมอดูอยู่แล้ว? สมัครเข้าระบบได้เลย <span aria-hidden="true">›</span>
        </Link>
      </div>
    </div>
  );
}

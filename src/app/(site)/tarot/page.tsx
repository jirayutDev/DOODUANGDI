import Link from "next/link";
import type { Metadata } from "next";
import { TAROT_CARDS } from "@/lib/tarot-data";
import { TarotDeck, type TarotSection } from "./tarot-deck";

export const metadata: Metadata = {
  title: "ความหมายไพ่ทาโรต์เทพฮินดู 78 ใบ | ดูดวงดิ",
  description: "รวมความหมายไพ่ทาโรต์เทพฮินดูเต็มสำรับ 78 ใบ แบบเข้าใจง่าย",
};

const SECTIONS: TarotSection[] = [
  { tab: "ชุดใหญ่ 22 ใบ", title: "ชุดใหญ่ 22 ใบ (Major Arcana)", cards: TAROT_CARDS.slice(0, 22) },
  { tab: "ไม้เท้า · พลัง", title: "สำรับไม้เท้า (Wands) · พลังและแรงบันดาลใจ", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-wands")) },
  { tab: "ถ้วย · ความรัก", title: "สำรับถ้วย (Cups) · อารมณ์และความรัก", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-cups")) },
  { tab: "ดาบ · ความคิด", title: "สำรับดาบ (Swords) · ความคิดและการตัดสินใจ", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-swords")) },
  { tab: "เหรียญ · เงินทอง", title: "สำรับเหรียญ (Pentacles) · เงินทองและการงาน", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-pentacles")) },
];

export default function TarotIndexPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-[300px]">
          <p className="text-sm text-muted-foreground">สำรับไพ่เทพฮินดู</p>
          <h1 className="mt-0.5 text-[28px] font-bold leading-[1.55] md:text-[40px]">ไพ่ 78 ใบ</h1>
          <p className="text-sm text-muted-foreground">ความหมายเต็มสำรับ แบบเข้าใจง่าย แตะที่ไพ่เพื่ออ่าน</p>
        </div>
        <Link
          href="/reading"
          className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground no-underline"
        >
          เปิดไพ่เลย
        </Link>
      </div>

      <TarotDeck sections={SECTIONS} />
    </div>
  );
}

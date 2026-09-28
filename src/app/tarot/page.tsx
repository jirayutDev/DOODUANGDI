import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { TAROT_CARDS, type TarotCard } from "@/lib/tarot-data";

export const metadata: Metadata = {
  title: "ความหมายไพ่ทาโรต์เทพฮินดู 78 ใบ | ดูดวงดิ",
  description: "รวมความหมายไพ่ทาโรต์เทพฮินดูเต็มสำรับ 78 ใบ แบบเข้าใจง่าย",
};

const SECTIONS: { title: string; cards: TarotCard[] }[] = [
  { title: "ชุดใหญ่ 22 ใบ (Major Arcana)", cards: TAROT_CARDS.slice(0, 22) },
  { title: "สำรับเหรียญ · เงินทองและการงาน", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-coins")) },
  { title: "สำรับตะเกียง · พลังและแรงบันดาลใจ", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-diya")) },
  { title: "สำรับหม้อน้ำ · อารมณ์และความรัก", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-kalasha")) },
  { title: "สำรับดาบ · ความคิดและการตัดสินใจ", cards: TAROT_CARDS.filter((c) => c.slug.endsWith("-khadga")) },
];

export default function TarotIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">ไพ่เทพฮินดู 78 ใบ</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        แตะไพ่ใบไหนก็ได้เพื่ออ่านความหมายเต็ม
      </p>

      <div className="flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-4 font-display text-xl text-primary">{section.title}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5">
              {section.cards.map((card) => (
                <Link key={card.slug} href={`/tarot/${card.slug}`}>
                  <Card className="h-full overflow-hidden rounded-[var(--radius-card)] border-primary/20 bg-card transition-colors hover:border-primary/50">
                    <div className="relative aspect-[7/12] w-full bg-muted">
                      <Image
                        src={card.imageUrl}
                        alt={`${card.nameTh} (${card.nameEn})`}
                        fill
                        sizes="(max-width: 640px) 45vw, 200px"
                        className="object-contain"
                      />
                    </div>
                    <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
                      <p className="font-display text-sm text-foreground">{card.nameTh}</p>
                      <p className="tarot-numeral text-xs">{card.nameEn}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

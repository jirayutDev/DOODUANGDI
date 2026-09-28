import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TAROT_CARDS, getTarotCardBySlug } from "@/lib/tarot-data";

export function generateStaticParams() {
  return TAROT_CARDS.map((card) => ({ slug: card.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = getTarotCardBySlug(slug);
  if (!card) return { title: "ไม่พบไพ่ใบนี้ | ดูดวงดิ" };

  return {
    title: `ความหมายไพ่ ${card.nameTh} (${card.nameEn}) | ดูดวงดิ`,
    description: card.uprightMeaning,
  };
}

export default async function TarotDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = getTarotCardBySlug(slug);
  if (!card) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/tarot">← กลับไปดูไพ่ทั้งหมด</Link>
      </Button>

      <Card className="overflow-hidden rounded-[var(--radius-card)] border-primary/30 bg-card">
        <div className="relative mx-auto aspect-[7/12] w-full max-w-xs bg-muted">
          <Image
            src={card.imageUrl}
            alt={`${card.nameTh} (${card.nameEn})`}
            fill
            sizes="320px"
            className="object-contain"
            priority
          />
        </div>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="tarot-numeral text-2xl">{card.number}</span>
          <h1 className="font-display text-3xl text-foreground">{card.nameTh}</h1>
          <p className="tarot-numeral text-base">{card.nameEn}</p>
          <Badge variant="secondary">องค์เทพ/สำรับ: {card.deity}</Badge>
          <p className="text-xs text-muted-foreground">{card.keywords}</p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4">
        <section>
          <h2 className="mb-2 font-display text-lg text-foreground">ความหมายเมื่อไพ่ตั้งตรง</h2>
          <p className="text-sm text-muted-foreground">{card.uprightMeaning}</p>
        </section>
        {card.reversedMeaning && (
          <section>
            <h2 className="mb-2 font-display text-lg text-foreground">ความหมายเมื่อไพ่กลับหัว</h2>
            <p className="text-sm text-muted-foreground">{card.reversedMeaning}</p>
          </section>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild>
          <Link href="/chat">ถามน้องมูเรื่องนี้ต่อ</Link>
        </Button>
      </div>
    </div>
  );
}

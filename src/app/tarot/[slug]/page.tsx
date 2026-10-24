import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TAROT_CARDS, getTarotCardBySlug } from "@/lib/tarot-data";
import { CardView } from "./card-view";

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
    <div className="mx-auto w-full max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <Link
        href="/tarot"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground no-underline hover:text-foreground"
      >
        <span aria-hidden="true">‹</span>กลับไปดูไพ่ทั้งหมด
      </Link>

      <CardView card={card}>
        <div className="mt-2.5 flex flex-wrap gap-3.5">
          <Link
            href="/chat"
            className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground no-underline"
          >
            ถามน้องมูเรื่องนี้ต่อ
          </Link>
        </div>
        <Link
          href="/tarot"
          className="mt-1.5 inline-flex min-h-11 items-center gap-1 self-start font-semibold text-primary no-underline"
        >
          ดูไพ่ทั้งสำรับ <span aria-hidden="true">›</span>
        </Link>
      </CardView>
    </div>
  );
}

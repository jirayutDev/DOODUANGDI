"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { TarotCard } from "@/lib/tarot-data";

export interface TarotSection {
  tab: string;
  title: string;
  cards: TarotCard[];
}

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

function numeral(card: TarotCard) {
  return card.isMajor ? (ROMAN[card.number] ?? String(card.number)) : String(card.number);
}

export function TarotDeck({ sections }: { sections: TarotSection[] }) {
  const [active, setActive] = useState(0);
  const section = sections[active];

  return (
    <>
      <div className="mt-[22px]">
        <div role="group" aria-label="เลือกสำรับ" className="inline-flex max-w-full flex-wrap gap-1.5 rounded-[14px] bg-secondary p-1">
          {sections.map((s, i) => (
            <button
              key={s.tab}
              type="button"
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={
                i === active
                  ? "min-h-10 cursor-pointer rounded-[10px] bg-cream px-3.5 text-sm font-bold text-ink"
                  : "min-h-10 cursor-pointer rounded-[10px] px-3.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {s.tab}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-[30px] grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
        {section.cards.map((card) => (
          <Link key={card.slug} href={`/tarot/${card.slug}`} className="flex flex-col items-center text-center text-foreground no-underline">
            <span className="w-full rounded-xl border border-line-soft p-[5px]">
              <span className="relative block aspect-[7/12] w-full overflow-hidden rounded-xl bg-secondary">
                <Image
                  src={card.imageUrl}
                  alt={`${card.nameTh} (${card.nameEn})`}
                  fill
                  sizes="(max-width: 768px) 45vw, 180px"
                  className="object-cover"
                />
              </span>
            </span>
            <span className="mt-2.5 text-[17px] font-semibold tracking-[0.1em] text-primary">{numeral(card)}</span>
            <span className="text-base font-medium leading-snug">{card.nameTh}</span>
            <span className="text-[15px] text-muted-foreground">{card.nameEn}</span>
          </Link>
        ))}
      </section>
    </>
  );
}

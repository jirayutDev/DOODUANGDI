"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import type { TarotCard } from "@/lib/tarot-data";

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

export function CardView({ card, children }: { card: TarotCard; children?: ReactNode }) {
  const [rev, setRev] = useState(false);
  const hasReversed = Boolean(card.reversedMeaning);
  const showRev = rev && hasReversed;
  const numeral = card.isMajor ? (ROMAN[card.number] ?? String(card.number)) : String(card.number);

  const tab = (on: boolean) =>
    `-mb-px min-h-11 cursor-pointer border-b-2 bg-transparent text-base ${
      on ? "border-primary font-semibold text-foreground" : "border-transparent font-normal text-muted-foreground"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-x-20 gap-y-10">
      <div className="mx-auto shrink-0">
        <div
          className="relative h-[400px] w-[240px] overflow-hidden rounded-xl shadow-[0_14px_28px_rgba(0,0,0,0.45)] transition-transform duration-[400ms]"
          style={{ transform: showRev ? "rotate(180deg)" : "rotate(-3deg)" }}
        >
          <Image
            src={card.imageUrl}
            alt={`${card.nameTh} (${card.nameEn})`}
            fill
            sizes="240px"
            className="object-cover"
            priority
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 basis-[340px] flex-col gap-3.5">
        <p className="text-lg text-muted-foreground">
          ใบที่ {card.number} · {card.nameEn} · {card.deity}
        </p>
        <p className="text-[28px] font-semibold leading-[1.55] text-primary">{numeral}</p>
        <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">{card.nameTh}</h1>
        <p className="-mt-1.5 text-[19px] text-primary">{card.keywords}</p>

        <div role="group" aria-label="ทิศทางไพ่" className="mt-3.5 flex gap-6 border-b border-border">
          <button type="button" aria-pressed={!showRev} onClick={() => setRev(false)} className={tab(!showRev)}>
            ไพ่ตั้งตรง
          </button>
          {hasReversed && (
            <button type="button" aria-pressed={showRev} onClick={() => setRev(true)} className={tab(showRev)}>
              ไพ่กลับหัว
            </button>
          )}
        </div>

        <blockquote className="mt-1.5 rounded-[14px] bg-secondary px-4 py-3 text-[19px] leading-[1.8]">
          {showRev ? card.reversedMeaning : card.uprightMeaning}
        </blockquote>
        {children}
      </div>
    </div>
  );
}

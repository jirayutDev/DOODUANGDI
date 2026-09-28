"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TAROT_CARDS, type TarotCard } from "@/lib/tarot-data";
import { SPREADS, type Spread } from "@/lib/spreads";

interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
}

type Phase = "idle" | "shuffling" | "picking" | "done";

// สับทั้งสำรับ 78 ใบมาแสดงเป็นวงแหวนซ้อนกัน (วงในสุดไปวงนอกสุด)
// จำนวนต่อวงเพิ่มขึ้นตามรัศมี ทำให้ระยะห่างระหว่างใบต่อวงเท่ากันทุกวง ไม่แน่นวงในหลวมวงนอก
export const RING_COUNTS = [10, 16, 22, 30] as const; // รวม = 78
const DECK_SIZE = RING_COUNTS.reduce((a, b) => a + b, 0);

function buildDeck(): DrawnCard[] {
  const pool = [...TAROT_CARDS];
  const deck: DrawnCard[] = [];
  for (let i = 0; i < DECK_SIZE && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [card] = pool.splice(idx, 1);
    // ไพ่ชุดใหญ่เป็นภาพองค์เทพ ห้ามกลับหัว — สุ่มกลับหัวได้เฉพาะไพ่ชุดเล็ก
    const reversed = card.isMajor ? false : Math.random() < 0.3;
    deck.push({ card, reversed });
  }
  return deck;
}

export default function ReadingPage() {
  const [spreadId, setSpreadId] = useState(SPREADS[0].id);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [deck, setDeck] = useState<DrawnCard[]>([]);
  const [pickedIndices, setPickedIndices] = useState<number[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryFetchedFor = useRef<string | null>(null);

  const spread = SPREADS.find((s) => s.id === spreadId)!;
  const needed = spread.positions.length;
  const result: DrawnCard[] = pickedIndices.map((i) => deck[i]);

  function resetAll() {
    setDeck([]);
    setPickedIndices([]);
    setSummary(null);
    summaryFetchedFor.current = null;
  }

  function handleShuffle() {
    resetAll();
    setPhase("shuffling");
  }

  function handleChangeSpread(id: string) {
    setSpreadId(id);
    resetAll();
    setPhase("idle");
  }

  function handlePick(deckIdx: number) {
    if (phase !== "picking") return;
    if (pickedIndices.includes(deckIdx)) return;
    if (pickedIndices.length >= needed) return;

    const next = [...pickedIndices, deckIdx];
    setPickedIndices(next);
    if (next.length === needed) {
      setTimeout(() => setPhase("done"), 700);
    }
  }

  // จังหวะ 1: สับไพ่ (โชว์กองไพ่เด้งๆ) แล้วแจกไพ่ออกมาเป็นพัด ให้ผู้ใช้เลือกเอง
  useEffect(() => {
    if (phase !== "shuffling") return;
    const timer = setTimeout(() => {
      setDeck(buildDeck());
      setPhase("picking");
    }, 900);
    return () => clearTimeout(timer);
  }, [phase]);

  // จังหวะ 2: เลือกไพ่ครบแล้ว ให้ AI ช่วยแปลผลรวมทั้งกระดาน
  useEffect(() => {
    if (phase !== "done" || result.length !== needed) return;
    const key = `${spreadId}:${pickedIndices.join(",")}`;
    if (summaryFetchedFor.current === key) return;
    summaryFetchedFor.current = key;

    setSummaryLoading(true);
    fetch("/api/reading-summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        spreadName: spread.name,
        question: question.trim() || undefined,
        results: result.map((r, i) => ({
          position: spread.positions[i],
          slug: r.card.slug,
          reversed: r.reversed,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => setSummary(data.summary ?? null))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pickedIndices]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">เปิดไพ่ดูดวง</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        เลือกรูปแบบการวางไพ่ที่เหมาะกับคำถามของคุณ แล้วสับไพ่และเลือกไพ่เองได้เลย
      </p>

      <div className="mb-6 grid gap-2">
        <Label htmlFor="question">อยากถามเรื่องอะไร (ไม่บังคับ)</Label>
        <Textarea
          id="question"
          placeholder="เช่น ความรักกับคนคุยตอนนี้จะไปต่อไหม"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          disabled={phase === "picking" || phase === "shuffling"}
        />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {SPREADS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleChangeSpread(s.id)}
            className={cn(
              "rounded-[var(--radius-card)] border p-4 text-left transition-colors",
              spreadId === s.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <p className="font-display text-base text-foreground">{s.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
          </button>
        ))}
      </div>

      <div className="mb-10 flex justify-center">
        <Button size="lg" onClick={handleShuffle} disabled={phase === "shuffling"}>
          {phase === "shuffling"
            ? "กำลังสับไพ่..."
            : phase === "picking"
              ? "สับไพ่ใหม่"
              : phase === "done"
                ? "สับไพ่ใหม่"
                : "สับไพ่"}
        </Button>
      </div>

      {phase === "shuffling" && <ShuffleAnimation />}

      {phase === "picking" && (
        <DeckFan deck={deck} picked={pickedIndices} needed={needed} onPick={handlePick} />
      )}

      {phase === "done" && result.length === needed && (
        <>
          <SpreadResult spread={spread} drawn={result} />
          <SummarySection loading={summaryLoading} summary={summary} />
          <SpreadDetailList spread={spread} drawn={result} />
        </>
      )}
    </div>
  );
}

function ShuffleAnimation() {
  return (
    <div className="mb-10 flex justify-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="card-back animate-shuffle -mx-3 aspect-[7/12] w-20 rounded-lg shadow-lg"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// วงไหน index เท่าไหร่ในวงนั้น และวงนั้นมีกี่ใบทั้งหมด
function getRingInfo(index: number) {
  let offset = index;
  for (let ringIndex = 0; ringIndex < RING_COUNTS.length; ringIndex++) {
    const ringCount = RING_COUNTS[ringIndex];
    if (offset < ringCount) return { ringIndex, indexInRing: offset, ringCount };
    offset -= ringCount;
  }
  const lastRing = RING_COUNTS.length - 1;
  return { ringIndex: lastRing, indexInRing: 0, ringCount: RING_COUNTS[lastRing] };
}

function DeckFan({
  deck,
  picked,
  needed,
  onPick,
}: {
  deck: DrawnCard[];
  picked: number[];
  needed: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="mb-10 flex flex-col items-center gap-6">
      <p className="text-center text-sm text-muted-foreground">
        แตะไพ่เพื่อเลือก — เลือกแล้ว {picked.length}/{needed} ใบ
      </p>
      {/* วงแหวนซ้อนกัน 4 ชั้นครบ 78 ใบ — รัศมีแต่ละวงแปรผันตรงกับจำนวนใบในวงนั้น (r = k*count)
          ทำให้ระยะห่างระหว่างใบต่อวง (เส้นรอบวง/จำนวนใบ = 2πk) เท่ากันทุกวงโดยอัตโนมัติ */}
      <div
        className="relative h-[21rem] w-[21rem] sm:h-[32rem] sm:w-[32rem]"
        style={{ "--fan-k": "clamp(4.5px, 1.15vw, 7.5px)" } as React.CSSProperties}
      >
        {deck.map((d, i) => {
          const isPicked = picked.includes(i);
          const pickOrder = picked.indexOf(i);
          const disabled = isPicked || picked.length >= needed;
          const { ringIndex, indexInRing, ringCount } = getRingInfo(i);
          const angle = (360 / ringCount) * indexInRing + ringIndex * 9;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              disabled={disabled}
              className={cn(
                "absolute top-1/2 left-1/2 [perspective:1200px]",
                !isPicked && picked.length < needed && "cursor-pointer"
              )}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(var(--fan-k) * ${ringCount} * -1)) rotate(${-angle}deg)`,
                zIndex: isPicked ? 1000 + i : i,
              }}
            >
              <div
                className="relative aspect-[7/12] w-7 transition-transform duration-700 [transform-style:preserve-3d] sm:w-9"
                style={{ transform: isPicked ? "rotateY(180deg)" : undefined }}
              >
                <div className="card-back absolute inset-0 flex items-center justify-center rounded-md shadow-md [backface-visibility:hidden]">
                  <span className="font-display text-[8px] text-[var(--color-tarot-gold)] sm:text-xs">ॐ</span>
                </div>
                <div
                  className="absolute inset-0 overflow-hidden rounded-md bg-muted shadow-lg [backface-visibility:hidden]"
                  style={{ transform: `rotateY(180deg) rotate(${d.reversed ? 180 : 0}deg)` }}
                >
                  <Image
                    src={d.card.imageUrl}
                    alt={d.card.nameTh}
                    fill
                    sizes="36px"
                    className="object-contain"
                  />
                </div>
              </div>
              {isPicked && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px]">
                  {pickOrder + 1}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpreadResult({ spread, drawn }: { spread: Spread; drawn: DrawnCard[] }) {
  const revealed = new Set(drawn.map((_, i) => i));

  if (spread.layout === "row") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        {drawn.map((d, i) => (
          <CardSlot
            key={i}
            position={spread.positions[i]}
            index={i + 1}
            drawn={d}
            faceUp={revealed.has(i)}
            dealIndex={i}
          />
        ))}
      </div>
    );
  }

  if (spread.layout === "diamond") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <CardSlot position={spread.positions[0]} index={1} drawn={drawn[0]} faceUp={revealed.has(0)} dealIndex={0} />
        <div className="flex gap-4">
          <CardSlot position={spread.positions[1]} index={2} drawn={drawn[1]} faceUp={revealed.has(1)} dealIndex={1} />
          <CardSlot position={spread.positions[2]} index={3} drawn={drawn[2]} faceUp={revealed.has(2)} dealIndex={2} />
        </div>
        <CardSlot position={spread.positions[3]} index={4} drawn={drawn[3]} faceUp={revealed.has(3)} dealIndex={3} />
      </div>
    );
  }

  // celtic cross: กางเขนตรงกลาง 6 ใบ + เสาไม้เท้าด้านข้าง 4 ใบ
  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
      <div className="grid w-full max-w-sm grid-cols-3 grid-rows-3 gap-3">
        <div className="col-start-2 row-start-1">
          <CardSlot position={spread.positions[2]} index={3} drawn={drawn[2]} faceUp={revealed.has(2)} dealIndex={2} compact />
        </div>
        <div className="col-start-1 row-start-2">
          <CardSlot position={spread.positions[4]} index={5} drawn={drawn[4]} faceUp={revealed.has(4)} dealIndex={4} compact />
        </div>
        <div className="relative col-start-2 row-start-2">
          <CardSlot position={spread.positions[0]} index={1} drawn={drawn[0]} faceUp={revealed.has(0)} dealIndex={0} compact />
          <div className="absolute inset-0 flex rotate-90 items-center justify-center opacity-90">
            <CardSlot position={spread.positions[1]} index={2} drawn={drawn[1]} faceUp={revealed.has(1)} dealIndex={1} compact bare />
          </div>
        </div>
        <div className="col-start-3 row-start-2">
          <CardSlot position={spread.positions[5]} index={6} drawn={drawn[5]} faceUp={revealed.has(5)} dealIndex={5} compact />
        </div>
        <div className="col-start-2 row-start-3">
          <CardSlot position={spread.positions[3]} index={4} drawn={drawn[3]} faceUp={revealed.has(3)} dealIndex={3} compact />
        </div>
      </div>

      <div className="grid w-full max-w-[220px] grid-cols-2 gap-3 lg:grid-cols-1">
        {[6, 7, 8, 9].map((posIdx) => (
          <CardSlot
            key={posIdx}
            position={spread.positions[posIdx]}
            index={posIdx + 1}
            drawn={drawn[posIdx]}
            faceUp={revealed.has(posIdx)}
            dealIndex={posIdx}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function SpreadDetailList({ spread, drawn }: { spread: Spread; drawn: DrawnCard[] }) {
  return (
    <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3">
      {drawn.map((d, i) => {
        const meaning = d.reversed ? d.card.reversedMeaning : d.card.uprightMeaning;
        return (
          <Card key={i} className="bg-card">
            <CardContent className="p-4 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">
                ใบที่ {i + 1} · {spread.positions[i]}
              </p>
              <p className="font-display text-base text-foreground">
                {d.card.nameTh} {d.reversed && <span className="text-destructive">(กลับหัว)</span>}
              </p>
              <p className="mt-1 text-muted-foreground">{meaning}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CardSlot({
  position,
  index,
  drawn,
  faceUp,
  dealIndex,
  compact = false,
  bare = false,
}: {
  position: string;
  index: number;
  drawn: DrawnCard;
  faceUp: boolean;
  dealIndex: number;
  compact?: boolean;
  bare?: boolean;
}) {
  const { card, reversed } = drawn;

  const flipImage = (
    <div className={cn("relative mx-auto [perspective:1200px]", compact ? "w-20" : "w-32")}>
      <div
        className="relative aspect-[7/12] w-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: faceUp ? "rotateY(180deg)" : undefined }}
      >
        <div className="card-back absolute inset-0 flex items-center justify-center rounded-lg [backface-visibility:hidden]">
          <span className="font-display text-lg text-[var(--color-tarot-gold)]">ॐ</span>
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-lg bg-muted [backface-visibility:hidden]"
          style={{ transform: `rotateY(180deg) rotate(${reversed ? 180 : 0}deg)` }}
        >
          <Image
            src={card.imageUrl}
            alt={`${card.nameTh} (${card.nameEn})`}
            fill
            sizes={compact ? "80px" : "128px"}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );

  if (bare) return flipImage;

  // ความสูงของทุกใบต้องเท่ากันเป๊ะ ไม่งั้น grid ของเซลติกครอสจะเบี้ยว (ชื่อไพ่/ป้ายกลับหัวยาวไม่เท่ากัน)
  // เลยจองพื้นที่ไว้คงที่ และย้ายเนื้อหาความหมายเต็มๆ ไปโชว์แยกเป็นลิสต์ด้านล่างแทน
  return (
    <div className="animate-deal-in" style={{ animationDelay: `${dealIndex * 150}ms` }}>
      <Card className={cn("bg-card", compact ? "w-24" : "w-40 sm:w-56")}>
        <CardContent className="flex flex-col items-center gap-2 p-3 text-center">
          <Badge variant="secondary" className="text-[10px]">
            ใบที่ {index}
          </Badge>
          {!compact && (
            <p className="line-clamp-2 h-8 text-xs text-muted-foreground">{position}</p>
          )}
          {flipImage}
          <div className="flex h-10 flex-col items-center justify-center">
            <p className="line-clamp-1 font-display text-sm text-foreground">{card.nameTh}</p>
            <p className={cn("text-[10px] text-destructive", !reversed && "invisible")}>กลับหัว</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummarySection({ loading, summary }: { loading: boolean; summary: string | null }) {
  if (!loading && !summary) return null;

  return (
    <Card className="mx-auto mt-8 max-w-xl bg-card">
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="font-display text-base text-primary">น้องมูสรุปให้</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">กำลังแปลผลไพ่ทั้งชุด...</p>
        ) : (
          <p className="whitespace-pre-line text-sm text-foreground">{summary}</p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { handleCoinError, featureCostLabel, type CoinApiError } from "@/lib/coin-client";

interface PersonalityMeta {
  title: string;
  subtitle: string;
  source: string;
  labelPrefix: string;
}

const TABS = [
  { key: "zodiac", label: "12 ราศี" },
  { key: "nakshatra", label: "12 นักษัตร" },
  { key: "day", label: "วันเกิด" },
];

export function PersonalityPicker({
  config,
  keys,
  categoryKey,
}: {
  config: PersonalityMeta;
  keys: string[];
  categoryKey: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  async function pick(key: string) {
    const id = `${categoryKey ?? ""}:${key}`;
    if (revealed.has(id)) {
      setSelected(key);
      return;
    }
    if (paying) return;
    setPaying(true);
    try {
      const res = await fetch("/api/personality", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: categoryKey, key }),
      });
      const data = (await res.json().catch(() => null)) as
        | (CoinApiError & { result?: { key: string; text: string } })
        | null;
      if (!res.ok || !data?.result) {
        if (!handleCoinError(data)) toast.error(data?.error ?? "ระบบใช้งานไม่ได้ชั่วคราว");
        return;
      }
      window.dispatchEvent(new Event("coins:changed"));
      const text = data.result.text;
      setTexts((prev) => ({ ...prev, [id]: text }));
      setRevealed((prev) => new Set(prev).add(id));
      setSelected(key);
    } catch {
      toast.error("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ");
    } finally {
      setPaying(false);
    }
  }

  async function share() {
    if (!selected) return;
    const body = texts[`${categoryKey}:${selected}`];
    if (!body) return;
    const text = `${config.labelPrefix}${selected}: ${body}`;
    try {
      if (navigator.share) await navigator.share({ title: config.title, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // ผู้ใช้ยกเลิกการแชร์
    }
  }

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">บุคลิกและนิสัย</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">
        {config.title}
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">{config.subtitle}</p>
      <p className="mt-1 max-w-[560px] text-xs text-muted-foreground/70">{config.source}</p>

      <div className="mt-4">
        <div role="group" aria-label="หมวดนิสัย" className="inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1">
          {TABS.map((t) => {
            const on = t.key === categoryKey;
            return (
              <Link
                key={t.key}
                href={`/personality/${t.key}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-[10px] px-3.5 text-sm",
                  on ? "bg-cream font-bold text-ink" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-[26px] flex flex-wrap items-start gap-x-[72px] gap-y-10">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          <div
            role="group"
            aria-label={config.title}
            className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2"
          >
            {keys.map((key) => {
              const on = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(key)}
                  disabled={paying}
                  className={cn(
                    "min-h-[46px] rounded border text-[16px] transition-colors",
                    on
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : "border-line-soft bg-transparent text-foreground hover:border-primary"
                  )}
                >
                  {config.labelPrefix}
                  {key}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            เปิดดูแต่ละรายการใช้ {featureCostLabel("personality")} (เปิดซ้ำไม่คิดเพิ่ม) · ต้องเข้าสู่ระบบ
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          {selected ? (
            <>
              <p className="text-sm text-muted-foreground">คน{config.labelPrefix || "ปี"}</p>
              <p className="-mt-1.5 text-[64px] font-bold leading-[1.9] text-primary">{selected}</p>
              <blockquote className="rounded-[14px] bg-card px-4 py-3 text-lg leading-[1.9]">
                {texts[`${categoryKey}:${selected}`]}
              </blockquote>
              <div className="mt-2 flex flex-wrap gap-3.5">
                <button
                  type="button"
                  onClick={share}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-secondary px-[22px] font-semibold text-foreground hover:bg-secondary/80"
                >
                  แชร์ให้เพื่อน
                </button>
                <Link
                  href="/duang/compatibility"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground hover:opacity-90"
                >
                  เข้ากับใครดี
                </Link>
              </div>
            </>
          ) : (
            <p className="text-soft-text">เลือกจากรายการเพื่อดูอุปนิสัย</p>
          )}
        </div>
      </div>
    </div>
  );
}

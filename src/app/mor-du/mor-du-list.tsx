"use client";

import { useMemo, useState } from "react";

export interface MorDuItem {
  userId: string;
  displayName: string;
  bio: string;
  specialties: string;
  priceQuestion: number;
  priceLiveMinute: number | null;
}

export function MorDuList({ list }: { list: MorDuItem[] }) {
  const [filter, setFilter] = useState<string>("");

  const tags = useMemo(() => {
    const set = new Set<string>();
    list.forEach((m) => m.specialties.split(",").forEach((s) => s.trim() && set.add(s.trim())));
    return Array.from(set);
  }, [list]);

  const shown = filter
    ? list.filter((m) => m.specialties.split(",").some((s) => s.trim() === filter))
    : list;

  return (
    <>
      {tags.length > 0 && (
        <div className="mt-[18px]">
          <div
            role="group"
            className="inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1"
          >
            {["", ...tags].map((t) => (
              <button
                key={t || "all"}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
                className={
                  filter === t
                    ? "min-h-10 cursor-pointer rounded-[10px] bg-cream px-3.5 text-sm font-bold text-ink"
                    : "min-h-10 cursor-pointer rounded-[10px] px-3.5 text-sm font-medium text-muted-foreground"
                }
              >
                {t || "ทั้งหมด"}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="mt-[26px] grid grid-cols-1 gap-6 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {shown.map((m) => (
          <article
            key={m.userId}
            className="flex flex-col gap-3.5 rounded-2xl border border-line-soft bg-card p-[22px]"
          >
            <div className="flex items-center gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-primary text-[26px] font-bold text-primary">
                {m.displayName.trim().charAt(0)}
              </span>
              <div className="flex-1">
                <p className="text-lg font-semibold">{m.displayName}</p>
                <p className="text-[16px] text-primary">✓ ผ่าน Safe Mu</p>
              </div>
            </div>
            <p className="text-sm text-soft-text">{m.bio}</p>
            <p className="border-t border-line-soft pt-3 text-[17px] text-muted-foreground">
              {m.specialties
                .split(",")
                .map((s) => s.trim())
                .join(" · ")}
            </p>
            <div className="flex gap-2.5">
              <span className="flex min-h-[50px] flex-1 items-center justify-center rounded-[14px] bg-primary px-3 text-[16px] font-bold text-primary-foreground">
                ถามเป็นข้อ ฿{m.priceQuestion}
              </span>
              {m.priceLiveMinute ? (
                <span className="flex min-h-[50px] flex-1 items-center justify-center rounded-[14px] bg-secondary px-3 text-[16px] font-semibold">
                  แชทสด ฿{m.priceLiveMinute}/นาที
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

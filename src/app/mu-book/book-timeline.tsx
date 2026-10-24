"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface BookEntry {
  id: string;
  source: "ai" | "mor_du";
  content: string;
  createdAt: string; // ISO
}

const FILTERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "ai", label: "น้องมู" },
  { value: "mor_du", label: "หมอดู" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function dayLabel(d: Date) {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

export function BookTimeline({ entries }: { entries: BookEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = entries.filter((e) => filter === "all" || e.source === filter);

  const groups: { label: string; items: BookEntry[] }[] = [];
  for (const e of shown) {
    const label = dayLabel(new Date(e.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <>
      <div className="mt-5">
        <div role="group" className="inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "min-h-10 rounded-[10px] px-3.5 text-sm transition-colors",
                filter === f.value
                  ? "bg-cream font-bold text-ink"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[760px]">
        {groups.map((g) => (
          <section key={g.label}>
            <p className="mt-6 text-2xl font-bold">{g.label}</p>
            {g.items.map((entry) => (
              <article key={entry.id} className="flex gap-4 border-b border-border py-4">
                <span className="w-14 shrink-0 text-[17px] text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-primary">{entry.source === "ai" ? "น้องมู" : "หมอดู · หมอดูจริง"}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-base">{entry.content}</p>
                </div>
              </article>
            ))}
          </section>
        ))}
        {groups.length === 0 && entries.length > 0 && (
          <p className="mt-8 text-muted-foreground">ยังไม่มีบันทึกในหมวดนี้</p>
        )}
      </div>
    </>
  );
}

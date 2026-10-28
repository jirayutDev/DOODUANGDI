"use client";

import { useState } from "react";
import Link from "next/link";
import { DIVINATION_GROUPS, categoryPrice, type DivinationCategory } from "@/lib/divination-categories";
import { Cost } from "@/lib/pricing-client";

function PriceBadge({ cat }: { cat: DivinationCategory }) {
  const price = categoryPrice(cat);
  if (!price) return null;
  if (price.kind === "free" || price.kind === "free-draw") {
    return (
      <span className="shrink-0 rounded-full border border-primary bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
        {price.kind === "free" ? "ฟรี" : "เปิดไพ่ฟรี"}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-line-soft px-2.5 py-0.5 text-xs text-soft-text">
      <Cost feature={price.feature} unit />
    </span>
  );
}

export function DuangHubList() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = DIVINATION_GROUPS.map((g) => ({
    ...g,
    categories: g.categories.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.blurb.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)
    ),
  })).filter((g) => g.categories.length > 0);

  return (
    <>
      <label className="mt-[22px] flex max-w-[480px] flex-col gap-0.5 text-sm text-muted-foreground">
        ค้นหาศาสตร์
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เช่น ความรัก ไพ่ เซียมซี"
          className="h-[50px] w-full rounded-xl bg-cream px-3.5 text-base text-ink outline-none placeholder:text-ink/50"
        />
      </label>

      {groups.length === 0 && <p className="mt-10 text-muted-foreground">ไม่พบศาสตร์ที่ค้นหา ลองคำอื่นดูนะ</p>}

      {groups.map((group, i) => (
        <section key={group.title} className="pt-10">
          <div className="flex items-baseline gap-3.5">
            <span className="text-[22px] font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="text-2xl leading-normal font-bold md:text-[26px]">{group.title}</h2>
          </div>
          <div className="mt-2 grid border-t border-border md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] md:gap-x-12">
            {group.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={cat.href}
                className="flex items-baseline gap-3 border-b border-border py-3.5 text-foreground"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[17px] font-medium">{cat.name}</span>
                  <span className="text-sm text-muted-foreground">{cat.blurb}</span>
                </span>
                {cat.status === "coming_soon" && (
                  <span className="shrink-0 rounded-full border border-line-soft px-2.5 py-0.5 text-xs text-muted-foreground">
                    เร็วๆ นี้
                  </span>
                )}
                <PriceBadge cat={cat} />
                <span
                  className={
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                    (cat.mode === "mor_du" ? "bg-primary text-primary-foreground" : "bg-secondary text-soft-text")
                  }
                >
                  {cat.mode === "ai" ? "น้องมู" : "หมอดูจริง"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

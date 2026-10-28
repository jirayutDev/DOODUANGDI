"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { cn } from "@/lib/utils";

export type HoroscopeKind = "daily" | "weekly" | "monthly";

const PROFILE_KEY = "ommu:birth-profile";

const TABS: { kind: HoroscopeKind; label: string; href: string }[] = [
  { kind: "daily", label: "รายวัน", href: "/daily-horoscope" },
  { kind: "weekly", label: "รายสัปดาห์", href: "/duang/weekly" },
  { kind: "monthly", label: "รายเดือน", href: "/duang/monthly" },
];

interface HoroscopeData {
  periodLabel: string;
  content: string;
}

// แยกเนื้อหาเป็นหัวข้อ "ป้าย: ข้อความ" — ดวงเก่าที่ไม่ได้อยู่ในรูปแบบนี้ (หรือมี ** ติดมา) จะคืน null แล้วแสดงเป็นข้อความธรรมดา
function parseSections(content: string): { label: string; text: string }[] | null {
  const out: { label: string; text: string }[] = [];
  for (const raw of content.replace(/\*\*/g, "").split("\n")) {
    const m = raw.trim().match(/^(ภาพรวม|ความรัก|การงาน|การเงิน|ข้อแนะนำ)\s*[:：]\s*(.+)$/);
    if (m) out.push({ label: m[1], text: m[2].trim() });
  }
  return out.length >= 3 ? out : null;
}

export function ZodiacHoroscope({ kind }: { kind: HoroscopeKind }) {
  const [sign, setSign] = useState<string | null>(null);
  const [fetched, setFetched] = useState<{
    key: string;
    data: HoroscopeData | null;
  } | null>(null);
  const key = sign ? `${kind}:${sign}` : null;
  const settled = fetched !== null && fetched.key === key;
  const loading = !!key && !settled;
  const error = settled && fetched.data === null;
  const data = settled ? fetched.data : null;

  // เลือกราศีจากโปรไฟล์ที่บันทึกไว้ (ถ้ามี)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      const z = JSON.parse(raw)?.zodiacSign;
      if (typeof z === "string" && (ZODIAC_SIGN_NAMES as readonly string[]).includes(z)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSign(z);
      }
    } catch {
      // อ่านไม่ได้ก็ไม่ต้องเลือกล่วงหน้า
    }
  }, []);

  useEffect(() => {
    if (!sign || !key) return;
    const controller = new AbortController();
    fetch(`/api/horoscope?kind=${kind}&sign=${encodeURIComponent(sign)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.content) throw new Error("failed");
        setFetched({ key, data: { periodLabel: json.periodLabel, content: json.content } });
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setFetched({ key, data: null });
      });
    return () => controller.abort();
  }, [kind, sign, key]);

  return (
    <div>
      <div className="mt-[18px] flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            href={t.href}
            aria-current={t.kind === kind ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors",
              t.kind === kind
                ? "border-primary bg-primary font-semibold text-primary-foreground"
                : "border-line-soft text-soft-text hover:border-primary"
            )}
          >
            {t.label}
          </Link>
        ))}
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">
          ฟรี ไม่ต้องล็อกอิน
        </span>
      </div>

      <div
        role="group"
        aria-label="เลือกราศี"
        className="mt-5 grid max-w-[640px] grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2"
      >
        {ZODIAC_SIGN_NAMES.map((z) => {
          const on = sign === z;
          return (
            <button
              key={z}
              type="button"
              aria-pressed={on}
              onClick={() => setSign(z)}
              className={cn(
                "min-h-[52px] rounded border py-1 text-[16px] leading-[1.55] transition-colors",
                on
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-line-soft bg-transparent text-foreground hover:border-primary"
              )}
            >
              <span className="block text-xs opacity-80">ราศี</span>
              <span className="block text-[16px]">{z}</span>
            </button>
          );
        })}
      </div>

      {!sign && <p className="mt-6 text-sm text-muted-foreground">เลือกราศีของคุณเพื่ออ่านดวง</p>}

      {sign && loading && (
        <p className="mt-8 text-sm text-muted-foreground">น้องมูกำลังเปิดดวงให้...</p>
      )}

      {sign && error && !loading && (
        <p className="mt-8 text-sm text-soft-text" role="alert">
          ตอนนี้ยังโหลดดวงไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่นะ
        </p>
      )}

      {data && !loading && (
        <div className="mt-8 max-w-[760px] rounded-[18px] bg-card p-5">
          <p className="text-sm text-muted-foreground">
            ราศี{sign} · {data.periodLabel}
          </p>
          {(() => {
            const sections = parseSections(data.content);
            if (!sections) {
              return (
                <p className="mt-2 whitespace-pre-line text-[17px] leading-[1.55] text-soft-text">
                  {data.content.replace(/\*\*/g, "")}
                </p>
              );
            }
            return (
              <dl className="mt-3 flex flex-col">
                {sections.map((s) => (
                  <div key={s.label} className="border-b border-border py-3 last:border-b-0">
                    <dt
                      className={cn(
                        "text-sm font-bold",
                        s.label === "ข้อแนะนำ" ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </dt>
                    <dd className="mt-1 text-[17px] leading-[1.55] text-foreground">{s.text}</dd>
                  </div>
                ))}
              </dl>
            );
          })()}
          <div className="mt-3">
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:text-cream"
            >
              กรอกวันเกิดเต็ม ให้ดวงแม่นขึ้น <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

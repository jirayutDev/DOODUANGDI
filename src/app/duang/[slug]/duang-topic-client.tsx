"use client";

import { useStoredJson } from "@/lib/use-stored-json";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ALL_DIVINATION_CATEGORIES } from "@/lib/divination-categories";
import type { BirthProfile } from "@/lib/astrology";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { cn } from "@/lib/utils";
import { ZodiacHoroscope } from "@/components/zodiac-horoscope";
import { handleCoinError, type CoinApiError } from "@/lib/coin-client";
import { Cost } from "@/lib/pricing-client";

const PROFILE_KEY = "ommu:birth-profile";

interface StoredProfile extends BirthProfile {
  birthDate: string;
}

export function DuangTopicClient({ slug }: { slug: string }) {
  const category = ALL_DIVINATION_CATEGORIES.find((c) => c.slug === slug);
  const needsPartner = slug === "compatibility";
  const freeKind = slug === "weekly" || slug === "monthly" ? slug : null;
  const costLabel = (
    <>
      ใช้ <Cost feature="topic-reading" unit /> · ต้องเข้าสู่ระบบ
    </>
  );

  const { value: profile, checked: profileChecked } = useStoredJson<StoredProfile>(PROFILE_KEY);
  const [partnerZodiac, setPartnerZodiac] = useState("");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<string | null>(null);

  useEffect(() => {
    // ต้องมีวันเกิดจริงก่อนถึงจะดูดวงได้ ไม่งั้นไม่มีข้อมูลอะไรให้ทำนาย (กันตอบมั่วๆ)
    if (profileChecked && profile && !needsPartner && !freeKind) fetchReading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileChecked, needsPartner]);

  async function fetchReading() {
    setLoading(true);
    setReading(null);
    try {
      const res = await fetch("/api/topic-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, profile, partnerZodiac }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (!handleCoinError(data as CoinApiError | null)) {
          setReading("ขอโทษที น้องมูดูดวงตอนนี้ไม่สำเร็จ ลองใหม่อีกทีนะ");
        }
        return;
      }
      setReading(data?.reading ?? "ขอโทษที น้องมูดูดวงตอนนี้ไม่สำเร็จ ลองใหม่อีกทีนะ");
      window.dispatchEvent(new Event("coins:changed"));
    } finally {
      setLoading(false);
    }
  }

  const wrap = "px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8";
  const btnPrimary =
    "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

  if (!category || category.mode !== "ai") {
    return (
      <div className={wrap}>
        <p className="text-sm text-muted-foreground">ไม่พบหัวข้อนี้</p>
        <Link
          href="/duang"
          className="mt-4 inline-flex min-h-11 items-center gap-1 font-semibold text-primary"
        >
          กลับไปหน้าทุกศาสตร์ <span aria-hidden>›</span>
        </Link>
      </div>
    );
  }

  if (freeKind) {
    return (
      <div className={wrap}>
        <p className="text-sm text-muted-foreground">เลือกราศีของคุณ</p>
        <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">
          {category.name}
        </h1>
        <p className="mt-2.5 max-w-[560px] text-soft-text">{category.blurb}</p>
        <ZodiacHoroscope kind={freeKind} />
      </div>
    );
  }

  // ไม่มีวันเกิดจริง = ไม่มีข้อมูลอะไรให้ทำนาย กันไม่ให้ AI ตอบมั่วๆ แบบไม่มีฐานข้อมูลรองรับ
  if (profileChecked && !profile) {
    return (
      <div className={wrap}>
        <p className="text-sm text-muted-foreground">ดวงเฉพาะเรื่อง</p>
        <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">
          {category.name}
        </h1>
        <p className="mt-2.5 max-w-[560px] text-soft-text">{category.blurb}</p>
        <div className="mt-7 flex max-w-[560px] flex-col items-start gap-3 rounded-[18px] bg-card p-5">
          <p>ยังไม่มีวันเกิดของคุณในระบบ น้องมูเลยยังไม่มีข้อมูลอะไรมาทำนายให้ตรงตัวได้</p>
          <p className="text-sm text-muted-foreground">
            กรอกวันเกิดก่อน ถึงจะดูดวงเรื่องนี้ได้จริง ไม่ใช่การเดามั่วๆ
          </p>
          <Link href="/profile" className={btnPrimary}>
            ไปกรอกวันเกิด
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <p className="text-sm text-muted-foreground">ดวงเฉพาะเรื่อง</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">
        {category.name}
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">{category.blurb}</p>
      <p className="mt-2 text-sm text-primary">{costLabel}</p>

      {needsPartner && (
        <div className="mt-[26px] flex items-center justify-center gap-5 border-y border-line-soft py-[22px] text-center">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">ราศีของเธอ</p>
            <p className="text-[34px] font-bold">{profile?.zodiacSign ?? "-"}</p>
          </div>
          <span aria-hidden className="text-[44px] text-primary">
            &amp;
          </span>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">ราศีของเขา</p>
            <p className="text-[34px] font-bold text-primary">{partnerZodiac || "-"}</p>
          </div>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-start gap-x-[72px] gap-y-10">
        {needsPartner && (
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
            <h2 className="text-[21px] font-bold leading-normal">เลือกราศีของอีกฝ่าย</h2>
            <div
              role="group"
              aria-label="เลือกราศีของอีกฝ่าย"
              className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2"
            >
              {ZODIAC_SIGN_NAMES.map((z) => {
                const on = partnerZodiac === z;
                return (
                  <button
                    key={z}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPartnerZodiac(z)}
                    className={cn(
                      "min-h-[46px] rounded border text-[16px] transition-colors",
                      on
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-line-soft bg-transparent text-foreground hover:border-primary"
                    )}
                  >
                    {z}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={fetchReading}
              disabled={!partnerZodiac || loading}
              className={cn(btnPrimary, "mt-1.5 w-full")}
            >
              {loading ? "กำลังดู..." : "ดูดวงสมพงศ์"}
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          {loading && !needsPartner && (
            <p className="text-soft-text">น้องมูกำลังดูดวงให้...</p>
          )}

          {reading && (
            <div className="rounded-[18px] bg-card p-5">
              <p className="text-[17px] text-muted-foreground">
                {needsPartner ? "ผลดวงสมพงศ์" : "คำทำนายจากน้องมู"}
              </p>
              <p className="mt-2 whitespace-pre-line text-soft-text">{reading}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5">
                <Link
                  href="/chat"
                  className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary"
                >
                  ถามน้องมูต่อ <span aria-hidden>›</span>
                </Link>
                {!needsPartner && (
                  <button
                    type="button"
                    onClick={fetchReading}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center font-semibold text-foreground disabled:opacity-50"
                  >
                    ดูอีกครั้ง
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

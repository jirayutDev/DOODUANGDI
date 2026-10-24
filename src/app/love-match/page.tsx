"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mars, Transgender, Venus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { handleCoinError, featureCostLabel } from "@/lib/coin-client";

type Gender = "male" | "female" | "lgbt";

interface PersonForm {
  name: string;
  birthDate: string;
  gender: Gender | "";
}

interface LoveMatchResult {
  score: number;
  summary: string;
  strengths: string[];
  cautions: string[];
  advice: string;
}

const STORAGE_KEY = "ommu:birth-profile";
const EMPTY: PersonForm = { name: "", birthDate: "", gender: "" };

const GENDER_OPTIONS: { value: Gender; label: string; Icon: typeof Mars }[] = [
  { value: "male", label: "ชาย", Icon: Mars },
  { value: "female", label: "หญิง", Icon: Venus },
  { value: "lgbt", label: "LGBT", Icon: Transgender },
];

const INPUT_CLS =
  "h-[50px] w-full rounded-xl border-0 bg-cream px-3.5 text-base text-ink outline-none [color-scheme:light] placeholder:text-ink/50 focus-visible:ring-2 focus-visible:ring-primary";

function PersonSection({
  title,
  value,
  onChange,
  idPrefix,
  placeholder,
}: {
  title: string;
  value: PersonForm;
  onChange: (v: PersonForm) => void;
  idPrefix: string;
  placeholder: string;
}) {
  const label = "flex flex-col gap-1.5 text-sm font-medium text-foreground";

  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-card p-5">
      <h2 className="font-bold">{title}</h2>

      <label className={label}>
        ชื่อเล่น
        <input
          id={`${idPrefix}-name`}
          type="text"
          aria-label={`${title} ชื่อ-สกุล`}
          placeholder={placeholder}
          maxLength={60}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className={INPUT_CLS}
        />
      </label>

      <label className={label}>
        วันเกิด
        <input
          id={`${idPrefix}-birth`}
          aria-label={`${title} วันเดือนปีเกิด`}
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={value.birthDate}
          onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
          className={INPUT_CLS}
        />
      </label>

      <div role="group" aria-label={`${title} เพศ`} className="grid grid-cols-3 gap-2">
        {GENDER_OPTIONS.map(({ value: g, label: text, Icon }) => (
          <button
            key={g}
            type="button"
            aria-pressed={value.gender === g}
            onClick={() => onChange({ ...value, gender: g })}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors",
              value.gender === g
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            <Icon className="size-5" aria-hidden />
            {text}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function LoveMatchPage() {
  const [you, setYou] = useState<PersonForm>(EMPTY);
  const [partner, setPartner] = useState<PersonForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoveMatchResult | null>(null);

  // เติมข้อมูล "คุณ" จากดวงโปรไฟล์ที่เคยกรอกไว้ (ถ้ามี)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { birthDate?: string; gender?: string };
      const gender: Gender | "" =
        p.gender === "male" || p.gender === "female" ? p.gender : p.gender === "other" ? "lgbt" : "";
      // อ่าน localStorage ได้เฉพาะฝั่ง client หลัง mount (เหมือนหน้า profile)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setYou((prev) => ({ ...prev, birthDate: p.birthDate ?? prev.birthDate, gender }));
    } catch {
      // ไม่มีข้อมูลเดิมก็กรอกใหม่ได้
    }
  }, []);

  const complete = (p: PersonForm) => p.name.trim() && p.birthDate && p.gender;

  async function handleSubmit() {
    if (!complete(you) || !complete(partner)) {
      toast.error("กรอกชื่อ วันเกิด และเพศ ให้ครบทั้งสองคนก่อนนะ");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/love-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ you, partner }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleCoinError(data)) return;
        throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      }
      setResult(data.result);
      window.dispatchEvent(new Event("coins:changed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">จับคู่ความรัก</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">
        เราสองคนเข้ากันไหม
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        ใส่ชื่อเล่นกับวันเกิดของทั้งสองคน น้องมูจะดูให้ว่าเข้ากันแค่ไหน และควรระวังเรื่องอะไร
      </p>

      <div className="mt-6 flex flex-wrap items-start gap-x-16 gap-y-8">
        <div
          className={cn(
            "min-w-0 flex-[1_1_320px] flex-col gap-3",
            result ? "hidden md:flex" : "flex"
          )}
        >
          <PersonSection title="คนที่ 1 (เรา)" idPrefix="you" placeholder="เช่น มายด์" value={you} onChange={setYou} />
          <PersonSection title="คนที่ 2 (เขา)" idPrefix="partner" placeholder="เช่น ต้น" value={partner} onChange={setPartner} />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "น้องมูกำลังทำนาย..." : "ดูว่าเข้ากันไหม"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            ใช้ {featureCostLabel("love-match")} · ต้องเข้าสู่ระบบและเป็นสมาชิก
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          {result ? (
            <>
              <p className="text-sm text-muted-foreground">ผลการจับคู่</p>
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-cream p-5 text-ink">
                <p className="text-sm text-[#5A4F80]">
                  {you.name.trim()} กับ {partner.name.trim()}
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold leading-[1.2]">{result.score}%</span>
                  <span>ความเข้ากันได้</span>
                </p>
                <div aria-hidden className="h-2 rounded-full bg-[#E2D8C4]">
                  <div
                    className="h-2 rounded-full bg-ink"
                    style={{ width: `${Math.min(100, Math.max(0, result.score))}%` }}
                  />
                </div>
                <p className="mt-1.5 leading-[1.7]">{result.summary}</p>
              </div>

              <div className="rounded-[18px] bg-card p-5">
                <h2 className="mb-2 font-bold text-primary">จุดแข็งของคู่นี้</h2>
                <ul className="grid list-disc gap-1 pl-5 text-sm leading-relaxed">
                  {result.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[18px] bg-card p-5">
                <h2 className="mb-2 font-bold text-primary">สิ่งที่ควรระวัง</h2>
                <ul className="grid list-disc gap-1 pl-5 text-sm leading-relaxed">
                  {result.cautions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[18px] bg-card p-5 text-sm leading-relaxed">
                <span className="font-bold text-primary">คำแนะนำจากน้องมู: </span>
                {result.advice}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/chat"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground hover:opacity-90"
                >
                  ถามน้องมูต่อ
                </Link>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-secondary px-[22px] font-semibold text-foreground hover:bg-secondary/80"
                >
                  ลองคู่ใหม่
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                ผลทำนายเป็นเพียงความบันเทิงและแนวทางประกอบการตัดสินใจ ไม่ใช่คำตัดสินความสัมพันธ์
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">ตัวอย่างผลลัพธ์</p>
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-cream p-5 text-ink">
                <p className="text-sm text-[#5A4F80]">มายด์ กับ ต้น</p>
                <p className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold leading-[1.2]">72%</span>
                  <span>เข้ากันดี</span>
                </p>
                <div aria-hidden className="h-2 rounded-full bg-[#E2D8C4]">
                  <div className="h-2 w-[72%] rounded-full bg-ink" />
                </div>
                <p className="mt-1.5 leading-[1.7]">
                  คำทำนายจากน้องมู เรื่องนิสัยที่เข้ากัน และสิ่งที่ควรระวัง
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

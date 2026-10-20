"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, Heart, Mars, Transgender, User, Venus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

function PersonSection({
  title,
  value,
  onChange,
  idPrefix,
}: {
  title: string;
  value: PersonForm;
  onChange: (v: PersonForm) => void;
  idPrefix: string;
}) {
  const field =
    "flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm";
  const input =
    "h-10 border-0 bg-transparent px-0 text-base text-white placeholder:text-white/70 focus-visible:ring-0 dark:bg-transparent";

  return (
    <section className="grid gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Heart className="size-6 fill-[#ef5b5b] text-[#ef5b5b]" aria-hidden />
        {title}
      </h2>

      <label className={field}>
        <User className="size-5 shrink-0" aria-hidden />
        <Input
          id={`${idPrefix}-name`}
          aria-label={`${title} ชื่อ-สกุล`}
          placeholder="ชื่อ-สกุล"
          maxLength={60}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className={input}
        />
      </label>

      <label className={field}>
        <Calendar className="size-5 shrink-0" aria-hidden />
        <Input
          id={`${idPrefix}-birth`}
          aria-label={`${title} วันเดือนปีเกิด`}
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={value.birthDate}
          onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
          className={cn(input, "[color-scheme:dark]", !value.birthDate && "text-white/70")}
        />
      </label>

      <div role="group" aria-label={`${title} เพศ`} className="grid grid-cols-3 gap-2">
        {GENDER_OPTIONS.map(({ value: g, label, Icon }) => (
          <button
            key={g}
            type="button"
            aria-pressed={value.gender === g}
            onClick={() => onChange({ ...value, gender: g })}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-2xl text-sm transition-colors",
              value.gender === g
                ? "bg-[#7b6cf0] text-white"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setResult(data.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-md bg-gradient-to-b from-[#4a2370] via-[#1b1a45] to-[#0d0b2b] px-5 pb-10 text-white sm:rounded-3xl">
      <div className="relative flex h-16 shrink-0 items-center justify-center">
        <Link
          href="/duang"
          aria-label="ย้อนกลับ"
          className="absolute -left-2 rounded-full p-2 text-white/90 hover:bg-white/10"
        >
          <ChevronLeft className="size-7" />
        </Link>
        <h1 className="font-display text-lg">จับคู่ความรัก</h1>
      </div>

      {result ? (
        <div className="grid gap-5 pt-2">
          <div className="rounded-3xl bg-white/10 p-6 text-center">
            <p className="text-sm text-white/80">
              {you.name.trim()} ❤ {partner.name.trim()}
            </p>
            <p className="mt-2 font-display text-6xl text-[#d4af6a]">{result.score}%</p>
            <p className="mt-1 text-sm text-white/80">ความเข้ากันได้</p>
          </div>

          <p className="leading-relaxed">{result.summary}</p>

          <div className="rounded-2xl bg-white/10 p-4">
            <h2 className="mb-2 font-display text-lg text-[#d4af6a]">จุดแข็งของคู่นี้</h2>
            <ul className="grid list-disc gap-1 pl-5 text-sm leading-relaxed">
              {result.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <h2 className="mb-2 font-display text-lg text-[#d4af6a]">สิ่งที่ควรระวัง</h2>
            <ul className="grid list-disc gap-1 pl-5 text-sm leading-relaxed">
              {result.cautions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-[#1e1b4b]/90 p-4 text-sm leading-relaxed">
            <span className="font-display text-[#d4af6a]">คำแนะนำจากน้องมู: </span>
            {result.advice}
          </div>

          <Button
            type="button"
            onClick={() => setResult(null)}
            className="h-12 rounded-2xl bg-gradient-to-b from-[#b79cf5] to-[#6f63e0] text-base text-white"
          >
            ทำนายใหม่
          </Button>
          <p className="text-center text-xs text-white/60">
            ผลทำนายเป็นเพียงความบันเทิงและแนวทางประกอบการตัดสินใจ ไม่ใช่คำตัดสินความสัมพันธ์
          </p>
        </div>
      ) : (
        <div className="grid gap-6 pt-2">
          <PersonSection title="ข้อมูลคุณ" idPrefix="you" value={you} onChange={setYou} />
          <PersonSection title="คนรู้ใจ" idPrefix="partner" value={partner} onChange={setPartner} />

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-2 h-14 rounded-2xl bg-gradient-to-b from-[#b79cf5] to-[#6f63e0] text-lg text-white hover:opacity-90"
          >
            {loading ? "น้องมูกำลังทำนาย..." : "คลิกทำนาย"}
            {!loading && <Heart className="size-5 fill-[#ef5b5b] text-[#ef5b5b]" aria-hidden />}
          </Button>
        </div>
      )}
    </div>
  );
}

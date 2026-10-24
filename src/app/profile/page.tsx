"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoredJson } from "@/lib/use-stored-json";
import { calculateBirthProfile, type BirthProfile } from "@/lib/astrology";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GENDERS = [
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "other", label: "อื่นๆ" },
];

const fieldLabel = "text-sm font-medium text-foreground";
const fieldInput =
  "h-[50px] rounded-xl border-0 bg-cream px-3.5 text-base text-ink placeholder:text-ink/50 md:text-base [color-scheme:light]";

const STORAGE_KEY = "ommu:birth-profile";

interface StoredProfile extends BirthProfile {
  birthDate: string;
  birthTime?: string;
  birthProvince?: string;
  gender?: string;
}

export default function ProfilePage() {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthProvince, setBirthProvince] = useState("");
  const [gender, setGender] = useState("");
  const [result, setResult] = useState<StoredProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const { value: stored, checked } = useStoredJson<StoredProfile>(STORAGE_KEY);
  const [seeded, setSeeded] = useState(false);
  if (checked && !seeded) {
    setSeeded(true);
    if (stored) {
      setResult(stored);
      setBirthDate(stored.birthDate);
      setBirthTime(stored.birthTime ?? "");
      setBirthProvince(stored.birthProvince ?? "");
      setGender(stored.gender ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!birthDate) {
      toast.error("กรอกวันเกิดก่อน");
      return;
    }

    const profile = calculateBirthProfile(birthDate);
    const stored: StoredProfile = {
      ...profile,
      birthDate,
      birthTime: birthTime || undefined,
      birthProvince: birthProvince || undefined,
      gender: gender || undefined,
    };
    setResult(stored);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // ไม่ต้องบล็อกผู้ใช้ถ้า localStorage ใช้ไม่ได้
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          birth_date: birthDate,
          birth_time: birthTime || null,
          birth_province: birthProvince || null,
          gender: gender || null,
          zodiac_sign: profile.zodiacSign,
          thai_birth_day: profile.thaiBirthDay,
          chinese_zodiac: profile.chineseZodiac,
          life_path_number: profile.lifePathNumber,
          lucky_color: profile.luckyColor,
        });
        if (error) throw error;
        toast.success("บันทึกดวงโปรไฟล์แล้ว");
      } else {
        toast.info("คำนวณดวงให้แล้ว — เข้าสู่ระบบเพื่อบันทึกถาวรและใช้กับ AI น้องมู");
      }
    } catch {
      toast.info("คำนวณดวงให้แล้ว (ยังไม่ได้เชื่อมต่อ Supabase — เก็บไว้ในเครื่องก่อน)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">ดวงโปรไฟล์</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">บอกวันเกิดหน่อย</h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        กรอกข้อมูลเกิดครั้งเดียว ทุกศาสตร์ในเว็บจะดึงข้อมูลนี้ไปใช้ร่วมกัน ยิ่งกรอกละเอียด ดวงยิ่งแม่น
      </p>

      <div className="mt-8 flex flex-wrap items-start gap-x-20 gap-y-12">
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 basis-[320px] flex-col gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthDate" className={fieldLabel}>
              วันเดือนปีเกิด
            </Label>
            <Input
              id="birthDate"
              type="date"
              className={fieldInput}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthTime" className={fieldLabel}>
              เวลาเกิด <span className="text-[13px] text-muted-foreground">(ถ้ามี)</span>
            </Label>
            <Input
              id="birthTime"
              type="time"
              className={fieldInput}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthProvince" className={fieldLabel}>
              จังหวัดเกิด <span className="text-[13px] text-muted-foreground">(ถ้ามี)</span>
            </Label>
            <Input
              id="birthProvince"
              className={fieldInput}
              placeholder="เช่น กรุงเทพฯ"
              value={birthProvince}
              onChange={(e) => setBirthProvince(e.target.value)}
            />
          </div>
          <fieldset>
            <legend className="mb-1.5 p-0 text-sm text-muted-foreground">
              เพศ <span className="text-[15px]">ไม่บังคับ</span>
            </legend>
            <div role="group" className="inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={gender === g.value}
                  onClick={() => setGender(gender === g.value ? "" : g.value)}
                  className={cn(
                    "min-h-10 rounded-[10px] px-3.5 text-sm transition-colors",
                    gender === g.value
                      ? "bg-cream font-bold text-ink"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </fieldset>
          <Button
            type="submit"
            disabled={saving}
            className="mt-2 h-auto min-h-[50px] w-full rounded-[14px] text-base font-bold"
          >
            {saving ? "กำลังคำนวณ..." : "คำนวณดวงของฉัน"}
          </Button>
        </form>

        {result && (
          <div className="flex min-w-0 flex-1 basis-[320px] flex-col gap-3.5">
            <h2 className="text-[26px] font-bold leading-[1.5]">ผลดวงโปรไฟล์ของเธอ</h2>
            <dl className="rounded-[18px] bg-card px-[18px] py-1">
              <ProfileStat label="ราศี" value={result.zodiacSign} />
              <ProfileStat label="วันเกิดไทย" value={`วัน${result.thaiBirthDay}`} />
              <ProfileStat label="สีมงคล" value={result.luckyColor} />
              <ProfileStat label="ปีนักษัตร" value={result.chineseZodiac} />
              <ProfileStat label="เลขศาสตร์" value={String(result.lifePathNumber)} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-[13px] last:border-b-0">
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[17px] font-bold">{value}</dd>
    </div>
  );
}

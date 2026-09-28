"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateBirthProfile, type BirthProfile } from "@/lib/astrology";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredProfile;
        setResult(parsed);
        setBirthDate(parsed.birthDate);
        setBirthTime(parsed.birthTime ?? "");
        setBirthProvince(parsed.birthProvince ?? "");
        setGender(parsed.gender ?? "");
      }
    } catch {
      // localStorage อาจใช้ไม่ได้ (private mode) — ปล่อยให้ฟอร์มว่างไว้
    }
  }, []);

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
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">ดวงโปรไฟล์</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        กรอกข้อมูลเกิดครั้งเดียว ทุกศาสตร์ในเว็บจะดึงข้อมูลนี้ไปใช้ร่วมกัน
      </p>

      <Card className="bg-card">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="birthDate">วันเดือนปีเกิด *</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="birthTime">เวลาเกิด (ถ้ามี)</Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthProvince">จังหวัดเกิด</Label>
                <Input
                  id="birthProvince"
                  placeholder="เช่น กรุงเทพฯ"
                  value={birthProvince}
                  onChange={(e) => setBirthProvince(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">เพศ</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="เลือกเพศ (ไม่บังคับ)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">หญิง</SelectItem>
                  <SelectItem value="male">ชาย</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "กำลังคำนวณ..." : "คำนวณดวงโปรไฟล์"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6 rounded-[var(--radius-card)] border-primary/30 bg-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">ผลดวงโปรไฟล์ของคุณ</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <ProfileStat label="ราศี" value={result.zodiacSign} />
            <ProfileStat label="วันเกิดไทย" value={`วัน${result.thaiBirthDay}`} />
            <ProfileStat label="สีมงคล" value={result.luckyColor} />
            <ProfileStat label="ปีนักษัตร" value={result.chineseZodiac} />
            <ProfileStat label="เลขศาสตร์" value={String(result.lifePathNumber)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg text-foreground">{value}</p>
    </div>
  );
}

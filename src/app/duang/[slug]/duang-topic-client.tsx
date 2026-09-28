"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_DIVINATION_CATEGORIES } from "@/lib/divination-categories";
import type { BirthProfile } from "@/lib/astrology";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";

const PROFILE_KEY = "ommu:birth-profile";

interface StoredProfile extends BirthProfile {
  birthDate: string;
}

export function DuangTopicClient({ slug }: { slug: string }) {
  const category = ALL_DIVINATION_CATEGORIES.find((c) => c.slug === slug);
  const needsPartner = slug === "compatibility";

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [partnerZodiac, setPartnerZodiac] = useState("");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      // อ่าน localStorage ไม่ได้ก็ถือว่าไม่มีโปรไฟล์
    } finally {
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    // ต้องมีวันเกิดจริงก่อนถึงจะดูดวงได้ ไม่งั้นไม่มีข้อมูลอะไรให้ทำนาย (กันตอบมั่วๆ)
    if (profileChecked && profile && !needsPartner) fetchReading();
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
      const data = await res.json();
      setReading(data.reading ?? "ขอโทษที น้องมูดูดวงตอนนี้ไม่สำเร็จ ลองใหม่อีกทีนะ");
    } finally {
      setLoading(false);
    }
  }

  if (!category || category.mode !== "ai") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">ไม่พบหัวข้อนี้</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/duang">กลับไปหน้าทุกศาสตร์</Link>
        </Button>
      </div>
    );
  }

  // ไม่มีวันเกิดจริง = ไม่มีข้อมูลอะไรให้ทำนาย กันไม่ให้ AI ตอบมั่วๆ แบบไม่มีฐานข้อมูลรองรับ
  if (profileChecked && !profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <h1 className="mb-2 font-display text-3xl text-foreground">{category.name}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{category.blurb}</p>
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <p className="text-sm text-foreground">
              ยังไม่มีวันเกิดของคุณในระบบ น้องมูเลยยังไม่มีข้อมูลอะไรมาทำนายให้ตรงตัวได้
            </p>
            <p className="text-xs text-muted-foreground">
              กรอกวันเกิดก่อน ถึงจะดูดวงเรื่องนี้ได้จริง ไม่ใช่การเดามั่วๆ
            </p>
            <Button asChild size="sm">
              <Link href="/profile">ไปกรอกวันเกิด</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-center font-display text-3xl text-foreground">{category.name}</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">{category.blurb}</p>

      {needsPartner && (
        <Card className="mb-6 bg-card">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">เลือกราศีของอีกฝ่าย</p>
            <Select value={partnerZodiac} onValueChange={setPartnerZodiac}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกราศี" />
              </SelectTrigger>
              <SelectContent>
                {ZODIAC_SIGN_NAMES.map((z) => (
                  <SelectItem key={z} value={z}>
                    ราศี{z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchReading} disabled={!partnerZodiac || loading}>
              {loading ? "กำลังดู..." : "ดูดวงสมพงศ์"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && !needsPartner && (
        <p className="text-center text-sm text-muted-foreground">น้องมูกำลังดูดวงให้...</p>
      )}

      {reading && (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="whitespace-pre-line text-sm text-foreground">{reading}</p>
            {!needsPartner && (
              <Button size="sm" variant="secondary" onClick={fetchReading} disabled={loading}>
                ดูอีกครั้ง
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { displayName } from "@/lib/auth-user";
import { loginHref } from "@/lib/safe-next";
import type { User } from "@supabase/supabase-js";

interface Application {
  status: "pending" | "approved" | "rejected" | "suspended";
  displayName: string;
}

const STATUS_LABEL: Record<Application["status"], string> = {
  pending: "รอแอดมินตรวจสอบ",
  approved: "อนุมัติแล้ว — เปิดให้บริการอยู่ในหน้าเลือกหมอดู",
  rejected: "ใบสมัครไม่ผ่าน ลองแก้ไขข้อมูลแล้วส่งใหม่ได้",
  suspended: "บัญชีถูกระงับชั่วคราว",
};

export default function MorDuApplyPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setCheckingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">สำหรับหมอดู</p>
      <h1 className="mt-0.5 mb-2 text-[28px] font-bold leading-[1.9] text-foreground md:text-[40px]">สมัครเป็นหมอดู</h1>
      <p className="mb-8 max-w-xl text-sm text-muted-foreground">
        เปิดร้านฟรี หลังผ่านการตรวจสอบตามมาตรฐาน Safe Mu — ใช้บัญชีเดียวกับที่ใช้ดูดวง เมื่อใบสมัครผ่านจะมีโปรไฟล์หมอดูเพิ่มเข้ามา
      </p>

      {checkingAuth ? null : user ? (
        <MorDuApplicationForm email={displayName(user)} />
      ) : (
        <MorDuLoginPrompt />
      )}
    </div>
  );
}

function MorDuLoginPrompt() {
  return (
    <Card className="max-w-xl border-line-soft bg-card">
      <CardContent className="pt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          เข้าสู่ระบบหรือสมัครสมาชิกก่อน แล้วกรอกใบสมัครหมอดูต่อได้เลย ใช้บัญชีเดียวกับที่ใช้ดูดวง
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={loginHref("/mor-du/apply")}>เข้าสู่ระบบ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={loginHref("/mor-du/apply", "signup")}>สมัครสมาชิก</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MorDuApplicationForm({ email }: { email: string }) {
  const [application, setApplication] = useState<Application | null>(null);
  const [checked, setChecked] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [priceQuestion, setPriceQuestion] = useState("");
  const [priceLiveMinute, setPriceLiveMinute] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/mor-du/me")
      .then((r) => r.json())
      .then((d) => setApplication(d.application))
      .finally(() => setChecked(true));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/mor-du/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          specialties,
          priceQuestion: Number(priceQuestion),
          priceLiveMinute: priceLiveMinute ? Number(priceLiveMinute) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("ส่งใบสมัครแล้ว รอแอดมินตรวจสอบนะ");
      setApplication({ status: "pending", displayName });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งใบสมัครไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!checked) return null;

  return (
    <>
      <div className="mb-4 flex max-w-xl items-center justify-between text-xs text-muted-foreground">
        <span>บัญชี: {email}</span>
        <button className="underline underline-offset-2" onClick={handleSignOut}>
          ออกจากระบบ
        </button>
      </div>

      {application && (
        <Card className="mb-6 max-w-xl border-line-soft bg-card">
          <CardContent className="flex items-center justify-between p-4 text-sm">
            <span>{application.displayName}</span>
            <Badge variant={application.status === "approved" ? "secondary" : "outline"}>
              {STATUS_LABEL[application.status]}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-xl border-line-soft bg-card">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">ชื่อที่ใช้แสดง</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">แนะนำตัว</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specialties">ศาสตร์ที่ถนัด (คั่นด้วยจุลภาค)</Label>
              <Input
                id="specialties"
                placeholder="เช่น ไพ่ยิปซี, โหราศาสตร์ไทย, ดูลายมือ"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priceQuestion">ราคาถามเป็นข้อ (บาท)</Label>
                <Input
                  id="priceQuestion"
                  type="number"
                  min={1}
                  value={priceQuestion}
                  onChange={(e) => setPriceQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceLiveMinute">ราคาแชทสด (บาท/นาที)</Label>
                <Input
                  id="priceLiveMinute"
                  type="number"
                  min={1}
                  placeholder="ไม่บังคับ"
                  value={priceLiveMinute}
                  onChange={(e) => setPriceLiveMinute(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "กำลังส่ง..." : application ? "ส่งใบสมัครใหม่อีกครั้ง" : "ส่งใบสมัคร"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

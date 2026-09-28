"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

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
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCheckingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">สมัครเป็นหมอดู</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        เปิดร้านฟรี หลังผ่านการตรวจสอบตามมาตรฐาน Safe Mu — บัญชีหมอดูแยกต่างหากจากบัญชีลูกดวงทั่วไป
      </p>

      {checkingAuth ? null : email ? (
        <MorDuApplicationForm email={email} />
      ) : (
        <MorDuAuthForm />
      )}
    </div>
  );
}

function MorDuAuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("สมัครบัญชีหมอดูสำเร็จ เช็กอีเมลเพื่อยืนยันตัวตนก่อนกรอกใบสมัคร");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("เข้าสู่ระบบสำเร็จ");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-card">
      <CardContent className="pt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          ใช้บัญชีสำหรับหมอดูโดยเฉพาะ ไม่ใช่บัญชีที่ใช้ดูดวงฝั่งลูกดวง
        </p>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mor-du-email">อีเมล</Label>
            <Input
              id="mor-du-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mor-du-password">รหัสผ่าน</Label>
            <Input
              id="mor-du-password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {mode === "signup" ? "สมัครบัญชีหมอดู" : "เข้าสู่ระบบหมอดู"}
          </Button>
          <button
            type="button"
            className="text-center text-xs text-muted-foreground underline underline-offset-2"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? "มีบัญชีหมอดูแล้ว เข้าสู่ระบบ" : "ยังไม่มีบัญชีหมอดู สมัครใหม่"}
          </button>
        </form>
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
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>บัญชีหมอดู: {email}</span>
        <button className="underline underline-offset-2" onClick={handleSignOut}>
          ออกจากระบบ
        </button>
      </div>

      {application && (
        <Card className="mb-6 bg-card">
          <CardContent className="flex items-center justify-between p-4 text-sm">
            <span>{application.displayName}</span>
            <Badge variant={application.status === "approved" ? "secondary" : "outline"}>
              {STATUS_LABEL[application.status]}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card">
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

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function callbackUrl(next = "/profile") {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("error") === "auth-failed";
  const [tab, setTab] = useState<"email" | "phone">("email");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">เข้าสู่ระบบ</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        เข้าสู่ระบบเพื่อบันทึกดวงโปรไฟล์และสมุดดวงของคุณถาวร
      </p>

      {authFailed && (
        <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ
        </p>
      )}

      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["email", "phone"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md py-1.5 text-sm font-medium transition-colors",
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "email" ? "อีเมล" : "เบอร์โทร"}
              </button>
            ))}
          </div>

          {tab === "email" ? (
            <EmailAuthForm onDone={() => router.push("/profile")} />
          ) : (
            <PhoneAuthForm onDone={() => router.push("/profile")} />
          )}

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">หรือ</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            <OAuthButton provider="google" label="ดำเนินการต่อด้วย Google" />
            <OAuthButton provider="custom:line" label="ดำเนินการต่อด้วย LINE" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailAuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl() },
        });
        if (error) throw error;
        toast.success("สมัครสำเร็จ เช็กอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("เข้าสู่ระบบสำเร็จ");
        onDone();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error("กรอกอีเมลก่อน");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) throw error;
      toast.success("ส่งลิงก์เข้าสู่ระบบไปที่อีเมลแล้ว เช็ก inbox ได้เลย");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งลิงก์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {mode === "signup" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
      </Button>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "มีบัญชีแล้ว เข้าสู่ระบบ" : "ยังไม่มีบัญชี สมัครสมาชิก"}
        </button>
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={handleMagicLink}
          disabled={loading}
        >
          ส่ง Magic Link แทน
        </button>
      </div>
    </form>
  );
}

function PhoneAuthForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      toast.success("ส่งรหัส OTP ทาง SMS แล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่ง OTP ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success("เข้าสู่ระบบสำเร็จ");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "รหัส OTP ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }

  if (otpSent) {
    return (
      <form onSubmit={handleVerifyOtp} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="otp">รหัส OTP ที่ได้รับทาง SMS</Label>
          <Input
            id="otp"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          ยืนยันรหัส
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => setOtpSent(false)}
        >
          เปลี่ยนเบอร์โทร
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="phone">เบอร์โทร (รูปแบบสากล เช่น +66812345678)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+66812345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        ส่งรหัส OTP
      </Button>
    </form>
  );
}

// Google เป็น provider มาตรฐานของ Supabase เปิดใช้ได้จาก Dashboard > Authentication > Providers
// LINE ไม่มีในลิสต์ provider มาตรฐาน ต้องตั้งเป็น Custom OAuth/OIDC Provider ชื่อ "line" เอง
// (Supabase Dashboard > Authentication > Providers > Custom OAuth/OIDC) แล้วเรียกผ่าน "custom:line"
// หมายเหตุ: LINE Login ฝั่งเว็บใช้ signature แบบ HS256 ซึ่ง Supabase custom OIDC รองรับเฉพาะ ES256
// ตอนนี้อาจเชื่อมไม่ได้ 100% ต้องเช็กกับเอกสาร Supabase อีกครั้งตอนตั้งค่าจริง
type LoginProvider = "google" | "custom:line";

function OAuthButton({ provider, label }: { provider: LoginProvider; label: string }) {
  async function handleClick() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) toast.error(`เชื่อมต่อไม่สำเร็จ: ${error.message}`);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick}>
      {label}
    </Button>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="mx-auto max-w-[1120px] px-[18px] pb-10 pt-4 md:px-10 md:pb-20 md:pt-8">
      <div className="flex flex-wrap items-center gap-x-24 gap-y-10">
        <div className="hidden min-w-0 flex-1 basis-[360px] flex-col items-center gap-3.5 text-center md:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tarot/the-star.jpg"
            alt="ไพ่ดาวแห่งความหวัง (The Star)"
            className="h-[390px] w-[240px] -rotate-3 rounded-xl object-cover shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
          />
          <p className="mt-2 text-[19px] text-muted-foreground">
            “หลังผ่านช่วงยากลำบาก ความหวังและกำลังใจกำลังกลับมา”
          </p>
        </div>

        <div className="flex min-w-0 max-w-[440px] flex-1 basis-[340px] flex-col gap-3.5">
          <p className="text-sm text-muted-foreground">ยินดีต้อนรับกลับมา</p>
          <h1 className="text-[28px] font-bold leading-[1.45] md:text-[40px]">เข้าสู่ระบบ</h1>
          <p className="-mt-1 text-sm text-muted-foreground">
            เข้าสู่ระบบแล้วน้องมูจะจำดวงเธอได้ และบันทึกสมุดดวงของคุณถาวร
          </p>

          {authFailed && (
            <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ
            </p>
          )}

          <div className="mt-3.5">
            <div role="group" className="inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1">
              {(["email", "phone"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "min-h-10 rounded-[10px] px-3.5 text-sm transition-colors",
                    tab === t
                      ? "bg-cream font-bold text-ink"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "email" ? "อีเมล" : "เบอร์โทร"}
                </button>
              ))}
            </div>
          </div>

          {tab === "email" ? (
            <EmailAuthForm onDone={() => router.push("/profile")} />
          ) : (
            <PhoneAuthForm onDone={() => router.push("/profile")} />
          )}

          <div aria-hidden="true" className="flex items-center gap-3 text-muted-foreground">
            <span className="h-px flex-1 bg-line-soft" />
            หรือ
            <span className="h-px flex-1 bg-line-soft" />
          </div>

          <div className="flex flex-col gap-3.5">
            <OAuthButton provider="google" label="ดำเนินการต่อด้วย Google" />
            <OAuthButton provider="custom:line" label="ดำเนินการต่อด้วย LINE" />
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldInput =
  "h-[50px] rounded-xl border-0 bg-cream px-3.5 text-base text-ink placeholder:text-ink/50 md:text-base";
const fieldLabel = "text-sm font-medium text-foreground";
const primaryBtn = "mt-2 h-auto min-h-[50px] w-full rounded-[14px] text-base font-bold";

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
    <form onSubmit={handleSubmit} className="grid gap-3.5">
      <div className="grid gap-2">
        <Label htmlFor="email" className={fieldLabel}>อีเมล</Label>
        <Input
          className={fieldInput}
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password" className={fieldLabel}>รหัสผ่าน</Label>
        <Input
          className={fieldInput}
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className={primaryBtn}>
        {mode === "signup" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
      </Button>
      <div className="flex flex-col items-center gap-2 text-[15px]">
        <button
          type="button"
          className="text-primary hover:text-cream"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "มีบัญชีแล้ว เข้าสู่ระบบ" : "ยังไม่มีบัญชี สมัครสมาชิก"}
        </button>
        <button
          type="button"
          className="text-primary hover:text-cream"
          onClick={handleMagicLink}
          disabled={loading}
        >
          ขอลิงก์เข้าสู่ระบบทางอีเมลแทน
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
      <form onSubmit={handleVerifyOtp} className="grid gap-3.5">
        <div className="grid gap-2">
          <Label htmlFor="otp" className={fieldLabel}>รหัส OTP ที่ได้รับทาง SMS</Label>
          <Input
          className={fieldInput}
            id="otp"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className={primaryBtn}>
          ยืนยันรหัส
        </Button>
        <button
          type="button"
          className="text-[15px] text-primary hover:text-cream"
          onClick={() => setOtpSent(false)}
        >
          เปลี่ยนเบอร์โทร
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="grid gap-3.5">
      <div className="grid gap-2">
        <Label htmlFor="phone" className={fieldLabel}>เบอร์โทร (รูปแบบสากล เช่น +66812345678)</Label>
        <Input
          className={fieldInput}
          id="phone"
          type="tel"
          placeholder="+66812345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className={primaryBtn}>
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
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      className="h-auto min-h-[50px] rounded border-[#4A4080] bg-transparent text-base text-foreground hover:bg-card"
    >
      {label}
    </Button>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth-user";
import { safeNext } from "@/lib/safe-next";
import { WELCOME_COINS } from "@/lib/coin-config";
import { cn } from "@/lib/utils";

function callbackUrl(next: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

type Mode = "signin" | "signup";

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
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [tab, setTab] = useState<"email" | "phone">("email");

  // ล็อกอินอยู่แล้วไม่ต้องเห็นหน้านี้ — พากลับหน้าที่ตั้งใจจะไป
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled && data.user) router.replace(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  function handleDone() {
    router.push(next);
    router.refresh();
  }

  const signup = mode === "signup";

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
          <div role="group" aria-label="สมัครหรือเข้าสู่ระบบ" className="inline-flex flex-wrap gap-1.5 self-start rounded-[14px] bg-card p-1">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "min-h-10 rounded-[10px] px-4 text-sm transition-colors",
                  mode === m
                    ? "bg-cream font-bold text-ink"
                    : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "signup" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm text-muted-foreground">{signup ? "ยินดีที่ได้รู้จัก" : "ยินดีต้อนรับกลับมา"}</p>
          <h1 className="-mt-2 text-[28px] font-bold leading-[1.9] md:text-[40px]">
            {signup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </h1>
          <p className="-mt-1 text-sm text-muted-foreground">
            {signup
              ? `สมัครฟรี รับ ${WELCOME_COINS} coin ไว้ลองใช้บริการ น้องมูจะจำดวงเธอได้ และบันทึกสมุดดวงของคุณถาวร`
              : "เข้าสู่ระบบแล้วน้องมูจะจำดวงเธอได้ และบันทึกสมุดดวงของคุณถาวร"}
          </p>

          {authFailed && (
            <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว ลองใหม่อีกครั้งนะ
            </p>
          )}

          <div className="mt-1.5">
            <div role="group" aria-label="ช่องทาง" className="inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1">
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
            <EmailAuthForm mode={mode} onModeChange={setMode} next={next} onDone={handleDone} />
          ) : (
            <PhoneAuthForm onDone={handleDone} />
          )}

          <div aria-hidden="true" className="flex items-center gap-3 text-muted-foreground">
            <span className="h-px flex-1 bg-line-soft" />
            หรือ
            <span className="h-px flex-1 bg-line-soft" />
          </div>

          <div className="flex flex-col gap-3.5">
            <OAuthButton provider="google" label="ดำเนินการต่อด้วย Google" next={next} />
            <OAuthButton provider="custom:line" label="ดำเนินการต่อด้วย LINE" next={next} />
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldInput =
  "h-[50px] rounded-xl border-0 bg-cream dark:bg-cream px-3.5 text-base text-ink placeholder:text-ink/50 md:text-base";
const fieldLabel = "text-sm font-medium text-foreground";
const primaryBtn = "mt-2 h-auto min-h-[50px] w-full rounded-[14px] text-base font-bold";
const linkBtn = "text-primary hover:text-cream disabled:opacity-50";

type EmailStage =
  | { kind: "form" }
  | { kind: "forgot" }
  // รอผู้ใช้กดลิงก์ในอีเมล: confirm = ยืนยันตอนสมัคร, reset = ตั้งรหัสผ่านใหม่, magic = ลิงก์เข้าสู่ระบบ
  | { kind: "sent"; purpose: "confirm" | "reset" | "magic" };

function EmailAuthForm({
  mode,
  onModeChange,
  next,
  onDone,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  next: string;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<EmailStage>({ kind: "form" });
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function sent(purpose: "confirm" | "reset" | "magic") {
    setPassword("");
    setCooldown(60);
    setStage({ kind: "sent", purpose });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl(next) },
        });
        if (error) throw error;
        // อีเมลนี้มีบัญชีอยู่แล้ว: Supabase ตอบ success หลอกโดยไม่ส่งอีเมล (กัน enumeration) identities จะว่าง
        if (data.user && data.user.identities?.length === 0) {
          toast.error("อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนนะ");
          onModeChange("signin");
          return;
        }
        // ถ้า Supabase ปิด Confirm email จะได้ session ทันที
        if (data.session) {
          toast.success("สมัครสำเร็จ ยินดีต้อนรับ");
          onDone();
          return;
        }
        sent("confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if ((error as { code?: string }).code === "email_not_confirmed") {
            sent("confirm");
            return;
          }
          throw error;
        }
        toast.success("เข้าสู่ระบบสำเร็จ");
        onDone();
      }
    } catch (err) {
      toast.error(mapAuthError(err));
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
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        // โหมดเข้าสู่ระบบจะไม่สร้างบัญชีใหม่ให้เงียบๆ
        options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: mode === "signup" },
      });
      if (error) throw error;
      sent("magic");
    } catch (err) {
      toast.error(mapAuthError(err, "ส่งลิงก์ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("/auth/reset-password"),
      });
      if (error) throw error;
      sent("reset");
    } catch (err) {
      toast.error(mapAuthError(err, "ส่งลิงก์ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (stage.kind !== "sent" || cooldown > 0) return;
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } =
        stage.purpose === "confirm"
          ? await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl(next) } })
          : stage.purpose === "reset"
            ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/auth/reset-password") })
            : await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: mode === "signup" },
              });
      if (error) throw error;
      setCooldown(60);
      toast.success("ส่งอีเมลอีกครั้งแล้ว");
    } catch (err) {
      toast.error(mapAuthError(err, "ส่งอีเมลไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }

  if (stage.kind === "sent") {
    const title =
      stage.purpose === "confirm"
        ? "ส่งอีเมลยืนยันแล้ว"
        : stage.purpose === "reset"
          ? "ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว"
          : "ส่งลิงก์เข้าสู่ระบบแล้ว";
    const body =
      stage.purpose === "confirm"
        ? "กดลิงก์ในอีเมลเพื่อยืนยันตัวตน แล้วจะเข้าสู่ระบบให้อัตโนมัติ"
        : stage.purpose === "reset"
          ? "กดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่"
          : "กดลิงก์ในอีเมลเพื่อเข้าสู่ระบบ ไม่ต้องใช้รหัสผ่าน";
    return (
      <div className="grid gap-3.5 rounded-[18px] bg-card p-5" role="status">
        <p className="text-lg font-bold">{title}</p>
        <p className="text-soft-text">
          เราส่งไปที่ <span className="break-all font-semibold text-foreground">{email}</span>
        </p>
        <p className="text-sm text-muted-foreground">{body} ถ้าไม่เจอลองดูในโฟลเดอร์สแปมด้วยนะ</p>
        <div className="flex flex-col items-start gap-2 text-[16px]">
          <button type="button" className={linkBtn} onClick={handleResend} disabled={loading || cooldown > 0}>
            {cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที` : "ส่งอีเมลอีกครั้ง"}
          </button>
          <button type="button" className={linkBtn} onClick={() => setStage({ kind: "form" })}>
            ใช้อีเมลอื่น / กลับ
          </button>
        </div>
      </div>
    );
  }

  if (stage.kind === "forgot") {
    return (
      <form onSubmit={handleForgot} className="grid gap-3.5">
        <p className="text-sm text-muted-foreground">กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
        <div className="grid gap-2">
          <Label htmlFor="email" className={fieldLabel}>อีเมล</Label>
          <Input
            className={fieldInput}
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className={primaryBtn}>
          ส่งลิงก์ตั้งรหัสผ่านใหม่
        </Button>
        <button type="button" className={cn(linkBtn, "text-[16px]")} onClick={() => setStage({ kind: "form" })}>
          กลับไปเข้าสู่ระบบ
        </button>
      </form>
    );
  }

  const signup = mode === "signup";
  return (
    <form onSubmit={handleSubmit} className="grid gap-3.5">
      <div className="grid gap-2">
        <Label htmlFor="email" className={fieldLabel}>อีเมล</Label>
        <Input
          className={fieldInput}
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className={fieldLabel}>รหัสผ่าน</Label>
          {!signup && (
            <button type="button" className={cn(linkBtn, "text-[16px]")} onClick={() => setStage({ kind: "forgot" })}>
              ลืมรหัสผ่าน?
            </button>
          )}
        </div>
        <Input
          className={fieldInput}
          id="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {signup && <p className="text-xs text-muted-foreground">อย่างน้อย 6 ตัวอักษร</p>}
      </div>
      <Button type="submit" disabled={loading} className={primaryBtn}>
        {signup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
      </Button>
      <div className="flex flex-col items-center gap-2 text-[16px]">
        <button type="button" className={linkBtn} onClick={() => onModeChange(signup ? "signin" : "signup")}>
          {signup ? "มีบัญชีแล้ว เข้าสู่ระบบ" : "ยังไม่มีบัญชี สมัครสมาชิก"}
        </button>
        <button type="button" className={linkBtn} onClick={handleMagicLink} disabled={loading}>
          {signup ? "สมัครด้วยลิงก์ทางอีเมล (ไม่ต้องตั้งรหัสผ่าน)" : "เข้าสู่ระบบด้วยลิงก์ทางอีเมล (ไม่ต้องใช้รหัสผ่าน)"}
        </button>
      </div>
    </form>
  );
}

// รับเบอร์ไทย 08x-xxx-xxxx แล้วแปลงเป็นรูปแบบสากล +66… ให้เอง (เบอร์ที่ขึ้นต้นด้วย + ใช้ตามที่พิมพ์)
function toE164(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("0")) return `+66${digits.slice(1)}`;
  if (digits.startsWith("66")) return `+${digits}`;
  return `+66${digits}`;
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
      const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
      if (error) throw error;
      setOtpSent(true);
      toast.success("ส่งรหัส OTP ทาง SMS แล้ว");
    } catch (err) {
      toast.error(mapAuthError(err, "ส่ง OTP ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: otp, type: "sms" });
      if (error) throw error;
      toast.success("เข้าสู่ระบบสำเร็จ");
      onDone();
    } catch (err) {
      toast.error(mapAuthError(err, "รหัส OTP ไม่ถูกต้อง"));
    } finally {
      setLoading(false);
    }
  }

  if (otpSent) {
    return (
      <form onSubmit={handleVerifyOtp} className="grid gap-3.5">
        <div className="grid gap-2">
          <Label htmlFor="otp" className={fieldLabel}>รหัส OTP ที่ส่งไปที่ {toE164(phone)}</Label>
          <Input
            className={fieldInput}
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
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
          className={cn(linkBtn, "text-[16px]")}
          onClick={() => {
            setOtp("");
            setOtpSent(false);
          }}
        >
          เปลี่ยนเบอร์โทร
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="grid gap-3.5">
      <div className="grid gap-2">
        <Label htmlFor="phone" className={fieldLabel}>เบอร์โทร</Label>
        <Input
          className={fieldInput}
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08x-xxx-xxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">ไม่ต้องสมัครก่อน — ถ้ายังไม่มีบัญชีจะสร้างให้อัตโนมัติหลังยืนยัน OTP</p>
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

function OAuthButton({ provider, label, next }: { provider: LoginProvider; label: string; next: string }) {
  async function handleClick() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) toast.error("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ");
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

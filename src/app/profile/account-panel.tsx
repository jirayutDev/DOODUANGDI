"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loginHref } from "@/lib/safe-next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const fieldLabel = "text-sm font-medium text-foreground";
const fieldInput =
  "h-[50px] rounded-xl border-0 bg-cream dark:bg-cream px-3.5 text-base text-ink placeholder:text-ink/50 md:text-base [color-scheme:light]";

// เบอร์ไทย: ตัวเลข 9-10 หลัก (รับช่องว่าง/ขีดตอนพิมพ์ แล้วเก็บเฉพาะตัวเลข)
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

export function AccountPanel() {
  const [state, setState] = useState<"loading" | "ready" | "loggedOut">("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled) return;
        if (!user) {
          setState("loggedOut");
          return;
        }
        const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string };
        setEmail(user.email ?? "");
        setName(meta.full_name ?? "");
        setPhone(meta.phone ?? "");
        setState("ready");
      })
      .catch(() => !cancelled && setState("loggedOut"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone === null) {
      toast.error("เบอร์โทรไม่ถูกต้อง (ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0)");
      return;
    }
    setSaving(true);
    const { error } = await createClient().auth.updateUser({
      data: { full_name: name.trim().slice(0, 80), phone: cleanPhone },
    });
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ");
      return;
    }
    setPhone(cleanPhone);
    window.dispatchEvent(new Event("profile:changed"));
    toast.success("บันทึกข้อมูลบัญชีแล้ว");
  }

  if (state === "loading") return <p className="text-muted-foreground">กำลังโหลด...</p>;
  if (state === "loggedOut") {
    return (
      <div className="rounded-[18px] bg-card p-6 text-center">
        <p className="text-soft-text">เข้าสู่ระบบเพื่อดูและแก้ไขข้อมูลบัญชี</p>
        <Button asChild className="mt-4 h-auto min-h-[46px] rounded-[14px] px-6 font-bold">
          <Link href={loginHref("/profile")}>เข้าสู่ระบบ</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-[480px] flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-email" className={fieldLabel}>
          อีเมล
        </Label>
        <Input id="acc-email" type="email" value={email} readOnly disabled className={fieldInput} />
        <p className="text-xs text-muted-foreground">อีเมลที่ใช้เข้าสู่ระบบ เปลี่ยนไม่ได้จากหน้านี้</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-name" className={fieldLabel}>
          ชื่อ
        </Label>
        <Input
          id="acc-name"
          className={fieldInput}
          placeholder="ชื่อที่อยากให้เรียก"
          maxLength={80}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-phone" className={fieldLabel}>
          เบอร์โทร <span className="text-[16px] text-muted-foreground">(ถ้ามี)</span>
        </Label>
        <Input
          id="acc-phone"
          type="tel"
          inputMode="tel"
          className={fieldInput}
          placeholder="08x-xxx-xxxx"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving} className="mt-2 h-auto min-h-[50px] w-full rounded-[14px] text-base font-bold">
        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลบัญชี"}
      </Button>
    </form>
  );
}

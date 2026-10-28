"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth-user";

const fieldInput =
  "h-[50px] rounded-xl border-0 bg-cream dark:bg-cream px-3.5 text-base text-ink placeholder:text-ink/50 md:text-base";
const fieldLabel = "text-sm font-medium text-foreground";

// หน้าตั้งรหัสผ่านใหม่ — มาถึงที่นี่ได้หลังกดลิงก์ในอีเมลรีเซ็ต (callback แลก session ให้แล้ว)
export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "noSession">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setState(data.user ? "ready" : "noSession");
      })
      .catch(() => !cancelled && setState("noSession"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("รหัสผ่านสองช่องไม่ตรงกัน");
      return;
    }
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(mapAuthError(error, "ตั้งรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้งนะ"));
      return;
    }
    toast.success("ตั้งรหัสผ่านใหม่แล้ว");
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pb-10 pt-4 md:px-10 md:pb-20 md:pt-8">
      <div className="flex max-w-[440px] flex-col gap-3.5">
        <p className="text-sm text-muted-foreground">บัญชีของฉัน</p>
        <h1 className="text-[28px] font-bold leading-[1.55] md:text-[40px]">ตั้งรหัสผ่านใหม่</h1>

        {state === "loading" && <p className="text-muted-foreground">กำลังตรวจสอบลิงก์...</p>}

        {state === "noSession" && (
          <div className="rounded-[18px] bg-card p-5">
            <p className="text-soft-text">ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว ขอลิงก์ใหม่จากหน้าเข้าสู่ระบบได้เลย</p>
            <Button asChild className="mt-4 h-auto min-h-[46px] rounded-[14px] px-6 font-bold">
              <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
            </Button>
          </div>
        )}

        {state === "ready" && (
          <form onSubmit={handleSubmit} className="grid gap-3.5">
            <div className="grid gap-2">
              <Label htmlFor="new-password" className={fieldLabel}>รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className={fieldInput}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">อย่างน้อย 6 ตัวอักษร</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password" className={fieldLabel}>ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className={fieldInput}
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={saving} className="mt-2 h-auto min-h-[50px] w-full rounded-[14px] text-base font-bold">
              {saving ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

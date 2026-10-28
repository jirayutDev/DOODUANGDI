"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      // path ลับอยู่ใน URL อยู่แล้ว: /<slug>/login -> /<slug>
      window.location.assign(window.location.pathname.replace(/\/login\/?$/, "") || "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-[18px] pb-10 pt-10">
      <h1 className="mb-6 text-[28px] font-bold leading-[1.9]">เข้าสู่ระบบแอดมิน</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          aria-label="ชื่อผู้ใช้"
          placeholder="ชื่อผู้ใช้"
          required
          className={field}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          aria-label="รหัสผ่าน"
          placeholder="รหัสผ่าน"
          required
          className={field}
        />
        <Button type="submit" disabled={busy || !username || !password} className="h-11 rounded-xl font-semibold">
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </form>
    </div>
  );
}

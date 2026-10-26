"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginHref } from "@/lib/safe-next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

interface SlipUploadProps {
  paymentId: string;
  onVerified: () => void;
  onManualNotified: () => void;
}

export function SlipUpload({ paymentId, onVerified, onManualNotified }: SlipUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !ALLOWED_TYPES.includes(f.type)) {
      setFile(null);
      setError("รองรับเฉพาะไฟล์ JPG หรือ PNG");
      return;
    }
    if (f && f.size > MAX_SIZE) {
      setFile(null);
      setError("ไฟล์ใหญ่เกิน 3MB");
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("กรุณาเลือกไฟล์สลิปก่อน");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("paymentId", paymentId);
      form.append("file", file);
      const res = await fetch("/api/payments/verify-slip", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; fallback?: boolean };

      if (res.ok) {
        toast.success("ตรวจสลิปผ่านแล้ว เปิดสิทธิ์ให้เรียบร้อย");
        window.dispatchEvent(new Event("coins:changed"));
        onVerified();
        return;
      }
      if (res.status === 503 && data.fallback) {
        const n = await fetch("/api/payments/notify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        if (!n.ok) {
          const nd = (await n.json().catch(() => ({}))) as { error?: string };
          setError(nd.error ?? "แจ้งชำระเงินไม่สำเร็จ");
          return;
        }
        toast.success("แจ้งชำระเงินแล้ว รอแอดมินตรวจสอบนะ");
        onManualNotified();
        return;
      }
      if (res.status === 401) {
        router.push(loginHref(window.location.pathname));
        return;
      }
      setError(data.error ?? "ตรวจสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-[14px] border border-line-soft bg-card p-4">
      <label htmlFor="slip-file" className="text-sm font-semibold text-soft-text">
        อัปโหลดสลิปโอนเงิน
      </label>
      <input
        id="slip-file"
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        disabled={loading}
        className="w-full rounded-[10px] bg-cream p-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-cream"
      />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !file} className="h-auto min-h-[50px] rounded-[14px] px-6 font-bold">
        {loading ? "กำลังตรวจสลิป..." : "ตรวจสลิป"}
      </Button>
    </form>
  );
}

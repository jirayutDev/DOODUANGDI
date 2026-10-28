"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// กล่องยืนยัน/กรอกข้อความกลางจอ แทน window.confirm / window.prompt ของเบราว์เซอร์ (ที่หน้าตาไม่เข้ากับเว็บ)
// ใช้: const r = await confirmModal({ title: "ยกเลิกคิวนี้?", tone: "danger" }); if (!r.confirmed) return;
// ขอข้อความ: confirmModal({ title, prompt: { label: "เหตุผล", required: true } }) แล้วอ่าน r.value
// ต้องมี <ConfirmHost /> อยู่ใน layout หลัก (ใส่ไว้ที่ app/layout.tsx แล้ว)

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  prompt?: { label: string; placeholder?: string; required?: boolean; maxLength?: number };
}

export interface ConfirmResult {
  confirmed: boolean;
  value: string;
}

type Request = { opts: ConfirmOptions; resolve: (r: ConfirmResult) => void };

const EVENT = "app:confirm";
let hostMounted = 0;

export function confirmModal(opts: ConfirmOptions): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve({ confirmed: false, value: "" });
    // กันค้าง: ถ้ายังไม่มีตัวแสดงกล่อง (เช่นหน้าที่ไม่ได้อยู่ใน layout หลัก) ถอยไปใช้ของเบราว์เซอร์แทน
    if (hostMounted === 0) {
      const text = opts.message ? `${opts.title}\n${opts.message}` : opts.title;
      if (opts.prompt) {
        const v = window.prompt(`${text}\n${opts.prompt.label}`) ?? "";
        return resolve({ confirmed: v.trim().length > 0 || !opts.prompt.required, value: v });
      }
      return resolve({ confirmed: window.confirm(text), value: "" });
    }
    window.dispatchEvent(new CustomEvent<Request>(EVENT, { detail: { opts, resolve } }));
  });
}

export function ConfirmHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    hostMounted++;
    function onRequest(e: Event) {
      const req = (e as CustomEvent<Request>).detail;
      if (req) setQueue((q) => [...q, req]);
    }
    window.addEventListener(EVENT, onRequest);
    return () => {
      hostMounted--;
      window.removeEventListener(EVENT, onRequest);
    };
  }, []);

  const current = queue[0];
  const needsValue = !!current?.opts.prompt?.required;
  const canConfirm = !needsValue || value.trim().length > 0;

  function finish(confirmed: boolean) {
    if (!current) return;
    current.resolve({ confirmed, value: confirmed ? value.trim() : "" });
    setValue("");
    setQueue((q) => q.slice(1));
  }

  return (
    <Dialog open={!!current} onOpenChange={(open) => !open && finish(false)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {current && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canConfirm) finish(true);
            }}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle className="text-xl leading-[1.55] font-bold">{current.opts.title}</DialogTitle>
              {current.opts.message && <DialogDescription className="text-base whitespace-pre-line">{current.opts.message}</DialogDescription>}
            </DialogHeader>
            {current.opts.prompt && (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft-text">
                {current.opts.prompt.label}
                <textarea
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={3}
                  maxLength={current.opts.prompt.maxLength ?? 200}
                  placeholder={current.opts.prompt.placeholder}
                  className="w-full rounded-xl bg-cream p-3 text-base font-normal text-ink outline-none placeholder:text-ink/40"
                />
              </label>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => finish(false)} className="h-auto min-h-[44px] rounded-[14px] px-5">
                {current.opts.cancelLabel ?? "ยกเลิก"}
              </Button>
              <Button
                type="submit"
                disabled={!canConfirm}
                variant={current.opts.tone === "danger" ? "destructive" : "default"}
                className="h-auto min-h-[44px] rounded-[14px] px-6 font-bold"
              >
                {current.opts.confirmLabel ?? "ยืนยัน"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export interface Identity {
  email: string;
  name: string;
  phone: string;
}

type EditableKey = "name" | "phone";

const FIELDS: { key: EditableKey; label: string; addLabel: string; placeholder: string }[] = [
  { key: "name", label: "ชื่อ", addLabel: "เพิ่มชื่อ", placeholder: "ชื่อที่อยากให้เรียก" },
  { key: "phone", label: "เบอร์โทร", addLabel: "เพิ่มเบอร์โทร", placeholder: "08x-xxx-xxxx" },
];

// เบอร์ไทย: ตัวเลข 9-10 หลักขึ้นต้นด้วย 0 (ตัดช่องว่าง/ขีดให้)
function clean(key: EditableKey, raw: string): string | null {
  if (key === "name") return raw.trim().slice(0, 80);
  const digits = raw.replace(/\D/g, "");
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

export function IdentityCard({ identity }: { identity: Identity }) {
  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(key: EditableKey) {
    setValue(identity[key]);
    setEditing(key);
  }

  async function save(key: EditableKey) {
    const next = clean(key, value);
    if (next === null || (key === "name" && next === "")) {
      toast.error(key === "phone" ? "เบอร์โทรไม่ถูกต้อง (ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0)" : "กรอกชื่อก่อน");
      return;
    }
    setSaving(true);
    const field = key === "name" ? "full_name" : "phone";
    const { error } = await createClient().auth.updateUser({ data: { [field]: next } });
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ");
      return;
    }
    setEditing(null);
    window.dispatchEvent(new Event("profile:changed"));
    toast.success("บันทึกแล้ว");
  }

  return (
    <dl className="mt-5 grid max-w-[560px] items-center gap-x-6 gap-y-2 rounded-[18px] bg-card px-[18px] py-3 text-sm sm:grid-cols-[auto_1fr]">
      {FIELDS.slice(0, 1).map((f) => renderField(f))}
      <dt className="text-muted-foreground">อีเมล</dt>
      <dd className="break-all font-semibold">{identity.email}</dd>
      {FIELDS.slice(1).map((f) => renderField(f))}
    </dl>
  );

  function renderField(f: (typeof FIELDS)[number]) {
    const current = identity[f.key];
    return (
      <div key={f.key} className="contents">
        <dt className="text-muted-foreground">{f.label}</dt>
        <dd className="min-w-0">
          {editing === f.key ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void save(f.key);
              }}
            >
              <Input
                autoFocus
                aria-label={f.label}
                type={f.key === "phone" ? "tel" : "text"}
                inputMode={f.key === "phone" ? "tel" : undefined}
                maxLength={f.key === "name" ? 80 : 20}
                placeholder={f.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-10 min-w-0 flex-1 basis-[160px] rounded-xl border-0 bg-cream px-3 text-base text-ink placeholder:text-ink/50 dark:bg-cream [color-scheme:light]"
              />
              <Button type="submit" disabled={saving} className="h-10 rounded-xl px-4 font-bold">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <button type="button" onClick={() => setEditing(null)} className="min-h-10 px-2 text-muted-foreground underline">
                ยกเลิก
              </button>
            </form>
          ) : current ? (
            <span className="flex items-center gap-3">
              <span className="font-semibold">{current}</span>
              <button type="button" onClick={() => startEdit(f.key)} className="min-h-10 text-muted-foreground underline">
                แก้ไข
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => startEdit(f.key)} className="min-h-10 font-semibold text-primary">
              + {f.addLabel}
            </button>
          )}
        </dd>
      </div>
    );
  }
}

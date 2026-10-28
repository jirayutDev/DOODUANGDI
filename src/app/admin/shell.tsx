import Link from "next/link";
import { adminBase } from "@/lib/admin-path";

// เปลือกหน้าแอดมินย่อย: ปุ่มกลับเมนู + หัวข้อ
export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-[18px] pb-10 pt-4 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <Link href={adminBase()} className="text-sm text-muted-foreground hover:text-foreground">
        ← เมนูแอดมิน
      </Link>
      <h1 className="mb-6 mt-2 font-display text-3xl text-foreground">{title}</h1>
      {children}
    </div>
  );
}

export function FilterTabs({
  base,
  param,
  current,
  options,
}: {
  base: string;
  param: string;
  current: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {options.map((o) => (
        <Link
          key={o.value}
          href={`${base}?${param}=${o.value}`}
          className={`rounded-full border px-3.5 py-1 text-sm ${
            current === o.value ? "border-primary bg-primary text-ink" : "border-line-soft text-soft-text hover:border-primary"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";

// เปลือกหน้าย่อยของหลังบ้าน: หัวหน้า (เมนูด้านข้างอยู่ที่ admin/layout.tsx)
export function AdminShell({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </>
  );
}

// แท็บกรองสถานะ: เปลี่ยนตัวกรองแล้วกลับไปหน้า 1 เสมอ (ไม่ส่ง page ไปกับลิงก์)
export function FilterTabs({
  base,
  param,
  current,
  options,
}: {
  base: string;
  param: string;
  current: string;
  options: { value: string; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => (
        <Link
          key={o.value}
          role="tab"
          aria-selected={current === o.value}
          href={`${base}?${param}=${o.value}`}
          className={cn(
            "inline-flex min-h-10 items-center rounded-full border px-4 py-1.5 text-sm",
            current === o.value ? "border-primary bg-primary font-bold text-primary-foreground" : "border-border text-soft-text hover:border-primary"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-80">{o.count.toLocaleString("th-TH")}</span>}
        </Link>
      ))}
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import { withParams } from "@/components/admin/ui";

// แถบตัวกรองของตารางหลังบ้าน: ฟอร์ม GET ธรรมดา (ไม่ต้องใช้ JavaScript) ค่าที่กรอกอยู่ใน URL จึงแชร์/รีเฟรช/กดย้อนกลับได้
// และตอนเปลี่ยนหน้า (Pagination) ส่ง params ต่อไปด้วย ตัวกรองจึงไม่หาย กดกรองใหม่จะกลับไปหน้า 1 เสมอ
// ใช้: <FilterBar path={`${base}/ledger`} values={{ kind, q }} keep={{ days }} fields={[...]} />

export type FilterField =
  | { name: string; label: string; type: "text"; placeholder?: string; wide?: boolean }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { name: string; label: string; type: "date" };

const control = "h-10 w-full rounded-lg border border-border bg-cream px-3 text-sm text-ink outline-none placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-primary";

export function FilterBar({
  path,
  fields,
  values,
  keep = {},
  className,
}: {
  path: string;
  fields: FilterField[];
  values: Record<string, string | undefined>;
  keep?: Record<string, string | undefined>; // พารามิเตอร์ที่ไม่ใช่ช่องกรองแต่ต้องคงไว้ เช่น status ของแท็บ
  className?: string;
}) {
  const active = fields.filter((f) => (values[f.name] ?? "") !== "").length;
  return (
    <form method="get" action={path} className={cn("mb-4 rounded-xl border border-border bg-card p-3", className)} role="search">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <label key={f.name} className={cn("flex flex-col gap-1 text-xs font-semibold text-muted-foreground", f.type === "text" && f.wide && "lg:col-span-2")}>
            {f.label}
            {f.type === "select" ? (
              <select name={f.name} defaultValue={values[f.name] ?? ""} className={control}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                type={f.type === "date" ? "date" : "search"}
                defaultValue={values[f.name] ?? ""}
                placeholder={f.type === "text" ? f.placeholder : undefined}
                maxLength={f.type === "text" ? 60 : undefined}
                className={control}
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
          กรอง
        </button>
        {active > 0 && (
          <Link href={withParams(path, keep)} className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm text-soft-text hover:border-primary">
            ล้างตัวกรอง
          </Link>
        )}
        {active > 0 && <span className="text-xs text-muted-foreground">กำลังกรอง {active} รายการ</span>}
      </div>
    </form>
  );
}

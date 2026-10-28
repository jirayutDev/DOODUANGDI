import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ชิ้นส่วนหน้าตาหลังบ้าน (ใช้ได้ทั้ง server และ client component) — ตาราง ป้ายสถานะ หัวหน้า และ pagination

export const PAGE_SIZE = 20;

// อ่านเลขหน้าจาก ?page= (ไม่ถูกต้อง = หน้า 1)
export function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 100000) : 1;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] leading-[1.4] font-bold">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {title && <h2 className="border-b border-border px-4 py-3 text-base font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
      {delta && <div className="mt-0.5">{delta}</div>}
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ตารางหลังบ้าน: จอใหญ่เป็นตารางปกติ (เลื่อนข้างได้ถ้ากว้างเกิน) จอมือถือ (< 768px) เปลี่ยนแต่ละแถวเป็น "การ์ด" ไม่ต้องเลื่อนข้าง
// ป้ายหัวคอลัมน์ถูกส่งต่อให้แต่ละเซลล์อัตโนมัติ (data-label) จาก <Th> ใน <thead> จึงไม่ต้องแก้ทุกหน้า สไตล์การ์ดอยู่ที่ .admin-cards ใน globals.css
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

function headerLabels(children: ReactNode): string[] {
  for (const part of Children.toArray(children)) {
    if (!isValidElement(part) || part.type !== "thead") continue;
    for (const tr of Children.toArray((part.props as { children?: ReactNode }).children)) {
      if (!isValidElement(tr)) continue;
      return Children.toArray((tr.props as { children?: ReactNode }).children)
        .filter(isValidElement)
        .map((th) => textOf((th.props as { children?: ReactNode }).children).trim());
    }
  }
  return [];
}

function labelRows(children: ReactNode, labels: string[]): ReactNode {
  return Children.map(children, (part) => {
    if (!isValidElement(part) || part.type !== "tbody") return part;
    const rows = Children.map((part.props as { children?: ReactNode }).children, (row) => {
      if (!isValidElement(row) || row.type !== Tr) return row;
      let i = 0;
      const cells = Children.toArray((row.props as { children?: ReactNode }).children).map((cell) => {
        if (!isValidElement(cell) || cell.type !== Td) return cell;
        const label = labels[i++];
        return label ? cloneElement(cell as ReactElement<{ label?: string }>, { label }) : cell;
      });
      return cloneElement(row as ReactElement<{ children?: ReactNode }>, {}, cells);
    });
    return cloneElement(part as ReactElement<{ children?: ReactNode }>, {}, rows);
  });
}

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("admin-scroll admin-cards overflow-x-auto rounded-xl border border-border bg-card", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{labelRows(children, headerLabels(children))}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("border-b border-border bg-[#1a1636] px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase", className)}>
      {children}
    </th>
  );
}

export function Tr({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <tr className={cn("border-b border-border/70 last:border-0 hover:bg-white/[0.03]", muted && "opacity-50")}>{children}</tr>;
}

export function Td({ children, className, label }: { children?: React.ReactNode; className?: string; label?: string }) {
  return (
    <td data-label={label} className={cn("px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

const TONES = {
  success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  danger: "border-red-500/40 bg-red-500/15 text-red-300",
  neutral: "border-border bg-white/5 text-soft-text",
} as const;

export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONES[tone])}>{children}</span>;
}

// สร้างลิงก์พร้อมพารามิเตอร์ (ข้ามค่าว่าง) เพื่อให้ตัวกรอง/ค้นหาคงอยู่ตอนเปลี่ยนหน้า
export function withParams(path: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

// หน้าที่จะแสดงเป็นปุ่มตัวเลข: หน้าแรก/สุดท้าย + รอบหน้าปัจจุบัน 2 หน้า (ช่องว่างใช้ null เป็นจุดไข่ปลา)
function pageWindow(page: number, pages: number): (number | null)[] {
  const set = new Set<number>([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

export function Pagination({
  page,
  total,
  perPage = PAGE_SIZE,
  path,
  params = {},
}: {
  page: number;
  total: number;
  perPage?: number;
  path: string;
  params?: Record<string, string | number | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, total);
  const href = (p: number) => withParams(path, { ...params, page: p > 1 ? p : undefined });
  const btn = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-1.5 text-sm";

  return (
    <nav aria-label="เปลี่ยนหน้า" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        {total === 0 ? "ไม่มีรายการ" : `แสดง ${from.toLocaleString("th-TH")}–${to.toLocaleString("th-TH")} จาก ${total.toLocaleString("th-TH")} รายการ`}
      </p>
      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {current > 1 ? (
            <Link href={href(current - 1)} className={cn(btn, "border-border hover:border-primary")}>
              ก่อนหน้า
            </Link>
          ) : (
            <span className={cn(btn, "border-border/50 text-muted-foreground/50")} aria-disabled="true">
              ก่อนหน้า
            </span>
          )}
          {pageWindow(current, pages).map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : n === current ? (
              <span key={n} aria-current="page" className={cn(btn, "border-primary bg-primary font-bold text-primary-foreground")}>
                {n}
              </span>
            ) : (
              <Link key={n} href={href(n)} className={cn(btn, "border-border hover:border-primary")}>
                {n}
              </Link>
            )
          )}
          {current < pages ? (
            <Link href={href(current + 1)} className={cn(btn, "border-border hover:border-primary")}>
              ถัดไป
            </Link>
          ) : (
            <span className={cn(btn, "border-border/50 text-muted-foreground/50")} aria-disabled="true">
              ถัดไป
            </span>
          )}
        </div>
      )}
    </nav>
  );
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

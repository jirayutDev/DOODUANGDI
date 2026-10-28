import { cn } from "@/lib/utils";

// ชิ้นส่วนกราฟหลังบ้าน (HTML ล้วน ไม่ต้องใช้ไลบรารี ใช้ได้ใน server component)
// หลักการ: แท่งบาง (<= 24px) มุมบนโค้ง 4px ฐานตรง, เส้นกริดบางเรียบ, ค่าที่ปลายหรือใน tooltip ไม่ใส่ตัวเลขทุกแท่ง,
// สีเดียวต่อกราฟ (เน้นด้วยสีเดียว) สีผูกกับความหมายไม่ผูกกับอันดับ, ตัวหนังสือใช้สีข้อความ ไม่ใช้สีของข้อมูล,
// มีตารางสำหรับโปรแกรมอ่านหน้าจอ (sr-only) เสมอ

// สีของข้อมูลบนพื้นการ์ดมืด (ตรวจด้วย validate_palette แล้ว: ทุกคู่ผ่านเกณฑ์ความต่างของสี/ตาบอดสี/คอนทราสต์ 3:1)
export const VIZ = {
  gold: "#E8B84A", // รายได้/เงิน (สีแบรนด์ ใช้เน้นตัวหลัก)
  blue: "#3987e5", // ผู้ใช้
  violet: "#9085e9", // coin / การใช้งาน
  orange: "#d95926", // ต้นทุน
  aqua: "#199e70",
  magenta: "#d55181",
} as const;

export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
}

export type Point = { label: string; value: number; sub?: string };

// เลือกขีดแกน Y ที่เป็นเลขกลมๆ (0, ครึ่ง, สูงสุด) โดยปัดสูงสุดขึ้นเป็น 1/2/5 x 10^n
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function ColumnChart({
  title,
  subtitle,
  data,
  color = VIZ.gold,
  format = (n: number) => n.toLocaleString("th-TH"),
  height = 168,
  className,
}: {
  title: string;
  subtitle?: string;
  data: Point[];
  color?: string;
  format?: (n: number) => string;
  height?: number;
  className?: string;
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const last = data.length - 1;
  const xLabels = new Set([0, Math.floor(last / 2), last]);
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <figure className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-base font-bold">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle ?? `รวม ${format(total)}`}</span>
      </figcaption>

      <div className="flex gap-2" role="img" aria-label={`${title} ${subtitle ?? `รวม ${format(total)}`}`}>
        {/* แกน Y: ค่ากลมๆ 3 ขีด */}
        <div className="flex flex-col justify-between text-right text-[11px] leading-none text-muted-foreground" style={{ height }}>
          <span>{compact(max)}</span>
          <span>{compact(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {/* เส้นกริดบางเรียบ */}
            {[0, 50, 100].map((p) => (
              <div key={p} className="pointer-events-none absolute inset-x-0 h-px bg-white/10" style={{ bottom: `${p}%` }} />
            ))}
            <div className="relative flex h-full items-end gap-[2px]">
              {data.map((d, i) => {
                const pct = (d.value / max) * 100;
                const edge = i < 2 ? "left-0" : i > last - 2 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <div key={`${d.label}-${i}`} className="group relative flex h-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80"
                      style={{ height: d.value > 0 ? `max(${pct}%, 2px)` : 0, background: color }}
                    />
                    {/* tooltip ตอนชี้: พื้นที่ชี้คือทั้งคอลัมน์ ไม่ใช่แค่ตัวแท่ง */}
                    <div
                      className={cn(
                        "pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border border-border bg-[#2e2658] px-2 py-1 text-xs shadow-lg group-hover:block",
                        edge
                      )}
                    >
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="ml-2 font-bold text-foreground">{format(d.value)}</span>
                      {d.sub && <span className="ml-2 text-muted-foreground">{d.sub}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* แกน X: ป้ายแค่ต้น/กลาง/ท้าย กันป้ายชนกัน */}
          <div className="mt-1 flex gap-[2px] text-[11px] text-muted-foreground">
            {data.map((d, i) => (
              <div key={`x-${i}`} className="relative flex-1">
                {xLabels.has(i) && (
                  <span className={cn("absolute top-0 whitespace-nowrap", i === 0 ? "left-0" : i === last ? "right-0" : "left-1/2 -translate-x-1/2")}>{d.label}</span>
                )}
              </div>
            ))}
          </div>
          <div className="h-4" />
        </div>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// แท่งแนวนอนเรียงอันดับ (เหมาะกับชื่อยาว/หลายหมวด) แท่งเดียวสีเดียว ตัวเลขที่ปลายแท่ง
export function HBarList({
  title,
  subtitle,
  items,
  color = VIZ.gold,
  format = (n: number) => n.toLocaleString("th-TH"),
  empty = "ยังไม่มีข้อมูลในช่วงนี้",
  className,
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: number; sub?: string }[];
  color?: string;
  format?: (n: number) => string;
  empty?: string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0);
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-base font-bold">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((it) => (
            <li key={it.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate text-soft-text" title={it.label}>
                {it.label}
              </span>
              <span className="h-2 rounded-full bg-white/10">
                <span className="block h-2 rounded-full" style={{ width: `${Math.max((it.value / max) * 100, it.value > 0 ? 2 : 0)}%`, background: color }} />
              </span>
              <span className="whitespace-nowrap text-right">
                <span className="font-semibold">{format(it.value)}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{it.sub ?? (total > 0 ? `${Math.round((it.value / total) * 100)}%` : "")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ส่วนต่างเทียบช่วงก่อนหน้า: มีลูกศรและตัวหนังสือด้วย ไม่พึ่งสีอย่างเดียว goodWhen = ขึ้นแล้วดี (รายได้) หรือลงแล้วดี (ต้นทุน)
export function Delta({ current, previous, goodWhen = "up" }: { current: number; previous: number; goodWhen?: "up" | "down" }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">– ไม่เปลี่ยน</span>;
  if (previous === 0) return <span className="text-xs text-muted-foreground">ช่วงก่อนไม่มีข้อมูล</span>;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-xs text-muted-foreground">– ใกล้เคียงช่วงก่อน</span>;
  const up = pct > 0;
  const good = up === (goodWhen === "up");
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", good ? "text-emerald-300" : "text-red-300")}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {up ? "+" : ""}
      {pct.toFixed(Math.abs(pct) >= 10 ? 0 : 1)}% <span className="font-normal text-muted-foreground">จากช่วงก่อน</span>
    </span>
  );
}

// เติมวันที่ว่างให้ครบช่วง (ผลรวมรายวันจาก SQL ไม่มีแถวของวันที่ไม่มีข้อมูล) — key เป็น YYYY-MM-DD ตามเวลาไทย
export function fillDays(days: number, byDay: Map<string, number>, now = Date.now()): Point[] {
  const DAY = 86_400_000;
  const BKK = 7 * 3_600_000;
  const todayStart = Math.floor((now + BKK) / DAY) * DAY; // เที่ยงคืนไทย (แทนด้วย UTC shift)
  const out: Point[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayStart - i * DAY);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
    out.push({ label, value: byDay.get(key) ?? 0 });
  }
  return out;
}

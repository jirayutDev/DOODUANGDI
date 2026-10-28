import { desc, count } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { getDb } from "@/db";
import { scheduledHoroscopes } from "@/db/schema";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { currentGenerationPeriodKey } from "@/lib/horoscopes";
import { AdminShell } from "../shell";
import { HoroscopeActions } from "./horoscope-actions";

const KINDS = [
  { kind: "daily", label: "รายวัน" },
  { kind: "weekly", label: "รายสัปดาห์" },
  { kind: "monthly", label: "รายเดือน" },
] as const;

export default async function AdminHoroscopesPage() {
  await requireAdminPage();
  const rows = await getDb()
    .select({ kind: scheduledHoroscopes.kind, periodKey: scheduledHoroscopes.periodKey, n: count() })
    .from(scheduledHoroscopes)
    .groupBy(scheduledHoroscopes.kind, scheduledHoroscopes.periodKey)
    .orderBy(desc(scheduledHoroscopes.periodKey))
    .limit(60);
  const total = ZODIAC_SIGN_NAMES.length;

  return (
    <AdminShell title="ดวงที่สร้างล่วงหน้า">
      <div className="grid gap-4 md:grid-cols-3">
        {KINDS.map(({ kind, label }) => {
          const key = currentGenerationPeriodKey(kind);
          const have = rows.find((r) => r.kind === kind && r.periodKey === key)?.n ?? 0;
          return (
            <div key={kind} className="rounded-[18px] border border-line-soft p-5">
              <h2 className="text-lg font-bold">{label}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">ช่วง {key}</p>
              <p className={`mt-2 text-2xl font-bold ${have === total ? "text-primary" : "text-soft-text"}`}>
                {have}/{total} ราศี
              </p>
              <HoroscopeActions kind={kind} />
            </div>
          );
        })}
      </div>
      <h2 className="mt-8 text-xl font-bold">ประวัติการสร้าง</h2>
      <ul className="mt-2">
        {rows.map((r) => (
          <li key={`${r.kind}-${r.periodKey}`} className="flex justify-between border-b border-border py-2 text-sm">
            <span>
              {KINDS.find((k) => k.kind === r.kind)?.label ?? r.kind} · <span className="font-mono">{r.periodKey}</span>
            </span>
            <span className="text-soft-text">
              {r.n}/{total}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</li>}
      </ul>
    </AdminShell>
  );
}

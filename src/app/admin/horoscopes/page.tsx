import { and, count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { scheduledHoroscopes } from "@/db/schema";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { currentGenerationPeriodKey } from "@/lib/horoscopes";
import { DataTable, EmptyRow, PAGE_SIZE, Pagination, Panel, parsePage, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../shell";
import { HoroscopeActions } from "./horoscope-actions";

const KINDS = [
  { kind: "daily", label: "รายวัน" },
  { kind: "weekly", label: "รายสัปดาห์" },
  { kind: "monthly", label: "รายเดือน" },
] as const;

export default async function AdminHoroscopesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const page = parsePage((await searchParams).page);
  const base = adminBase() === "/" ? "" : adminBase();
  const total = ZODIAC_SIGN_NAMES.length;

  const db = getDb();
  const groupCols = [scheduledHoroscopes.kind, scheduledHoroscopes.periodKey] as const;
  const currentKeys = KINDS.map((k) => ({ kind: k.kind, key: currentGenerationPeriodKey(k.kind) }));
  const [currentCounts, history, [{ n: groups }]] = await Promise.all([
    // จำนวนราศีที่มีแล้วของช่วงปัจจุบันแต่ละชนิด
    Promise.all(
      currentKeys.map(async ({ kind, key }) => {
        const [row] = await db
          .select({ n: count() })
          .from(scheduledHoroscopes)
          .where(and(eq(scheduledHoroscopes.kind, kind), eq(scheduledHoroscopes.periodKey, key)));
        return { kind, n: row.n };
      })
    ),
    db
      .select({ kind: scheduledHoroscopes.kind, periodKey: scheduledHoroscopes.periodKey, n: count() })
      .from(scheduledHoroscopes)
      .groupBy(...groupCols)
      .orderBy(desc(scheduledHoroscopes.periodKey), scheduledHoroscopes.kind)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(db.selectDistinct({ kind: scheduledHoroscopes.kind, periodKey: scheduledHoroscopes.periodKey }).from(scheduledHoroscopes).as("g")),
  ]);

  return (
    <AdminShell title="ดวงที่สร้างล่วงหน้า" description="สถานะดวงรายวัน/สัปดาห์/เดือนของช่วงปัจจุบัน เติมที่ขาดหรือสร้างใหม่ (สร้างทีละราศี ใช้เวลาประมาณหนึ่งนาที)">
      <div className="grid gap-4 md:grid-cols-3">
        {KINDS.map(({ kind, label }) => {
          const key = currentKeys.find((k) => k.kind === kind)!.key;
          const have = currentCounts.find((r) => r.kind === kind)?.n ?? 0;
          return (
            <Panel key={kind} className="p-5">
              <h2 className="text-lg font-bold">{label}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">ช่วง {key}</p>
              <p className={`mt-2 text-2xl font-bold ${have === total ? "text-primary" : "text-soft-text"}`}>
                {have}/{total} ราศี
              </p>
              <HoroscopeActions kind={kind} />
              <Link href={`${base}/horoscopes/${kind}/${key}`} className="mt-3 inline-block text-sm text-primary hover:underline">
                ดูข้อความที่สร้างแล้ว
              </Link>
            </Panel>
          );
        })}
      </div>

      <h2 className="mt-8 mb-2 text-lg font-bold">ประวัติการสร้าง</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>ชนิด</Th>
            <Th>ช่วงเวลา</Th>
            <Th className="text-right">จำนวนราศี</Th>
            <Th>สถานะ</Th>
          </tr>
        </thead>
        <tbody>
          {history.map((r) => (
            <Tr key={`${r.kind}-${r.periodKey}`}>
              <Td>{KINDS.find((k) => k.kind === r.kind)?.label ?? r.kind}</Td>
              <Td className="font-mono text-xs">
                <Link href={`${base}/horoscopes/${r.kind}/${r.periodKey}`} className="text-primary hover:underline">
                  {r.periodKey}
                </Link>
              </Td>
              <Td className="text-right">
                {r.n}/{total}
              </Td>
              <Td>{r.n === total ? <StatusBadge tone="success">ครบ</StatusBadge> : <StatusBadge tone="warning">ไม่ครบ</StatusBadge>}</Td>
            </Tr>
          ))}
          {history.length === 0 && <EmptyRow cols={4}>ยังไม่มีข้อมูล</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={groups} path={`${base}/horoscopes`} />
    </AdminShell>
  );
}

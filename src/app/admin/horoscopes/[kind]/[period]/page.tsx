import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { scheduledHoroscopes } from "@/db/schema";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { currentGenerationPeriodKey, isHoroscopeKind } from "@/lib/horoscopes";
import { DataTable, fmtDate, StatusBadge, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../../../shell";
import { SignRegenButton } from "./sign-regen-button";

const KIND_LABEL = { daily: "รายวัน", weekly: "รายสัปดาห์", monthly: "รายเดือน" } as const;

// ดูข้อความดวงที่สร้างไว้จริงของช่วงเวลาหนึ่ง ทีละราศี (ใช้เช็กว่า AI เขียนอะไรไป) ช่วงปัจจุบันสร้าง/สร้างใหม่ทีละราศีได้
export default async function AdminHoroscopePeriodPage({ params }: { params: Promise<{ kind: string; period: string }> }) {
  await requireAdminPage();
  const { kind, period } = await params;
  if (!isHoroscopeKind(kind) || !/^\d{4}-\d{2}(-\d{2})?$/.test(period)) notFound();
  const base = adminBase() === "/" ? "" : adminBase();

  const rows = await getDb()
    .select()
    .from(scheduledHoroscopes)
    .where(and(eq(scheduledHoroscopes.kind, kind), eq(scheduledHoroscopes.periodKey, period)));
  const bySign = new Map(rows.map((r) => [r.sign, r]));
  const isCurrent = currentGenerationPeriodKey(kind) === period;
  const have = ZODIAC_SIGN_NAMES.filter((s) => bySign.has(s)).length;

  return (
    <AdminShell
      title={`ดวง${KIND_LABEL[kind]} · ${period}`}
      description={`สร้างแล้ว ${have}/${ZODIAC_SIGN_NAMES.length} ราศี${isCurrent ? " (ช่วงปัจจุบัน สร้างหรือสร้างใหม่ทีละราศีได้)" : ""}`}
      actions={
        <Link href={`${base}/horoscopes`} className="text-sm text-primary hover:underline">
          ← กลับ
        </Link>
      }
    >
      <DataTable className="[&_table]:min-w-[760px]">
        <thead>
          <tr>
            <Th>ราศี</Th>
            <Th>สร้างเมื่อ</Th>
            <Th>ข้อความ</Th>
            {isCurrent && <Th className="text-right">จัดการ</Th>}
          </tr>
        </thead>
        <tbody>
          {ZODIAC_SIGN_NAMES.map((sign) => {
            const r = bySign.get(sign);
            return (
              <Tr key={sign}>
                <Td className="align-top font-medium whitespace-nowrap">{sign}</Td>
                <Td className="align-top whitespace-nowrap text-muted-foreground">{r ? fmtDate(r.createdAt) : <StatusBadge tone="warning">ยังไม่ได้สร้าง</StatusBadge>}</Td>
                <Td className="max-w-[560px] align-top whitespace-pre-line text-soft-text">{r?.content ?? "-"}</Td>
                {isCurrent && (
                  <Td className="align-top text-right">
                    <div className="flex justify-end">
                      <SignRegenButton kind={kind} sign={sign} exists={!!r} />
                    </div>
                  </Td>
                )}
              </Tr>
            );
          })}
        </tbody>
      </DataTable>
    </AdminShell>
  );
}

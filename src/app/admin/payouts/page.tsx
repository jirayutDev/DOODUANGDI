import { count, desc, eq, sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { morDuLedger, morDus } from "@/db/schema";
import { coinsToBaht } from "@/lib/booking";
import { getPricing } from "@/lib/pricing";
import { DataTable, EmptyRow, fmtDate, PAGE_SIZE, Pagination, parsePage, Td, Th, Tr } from "@/components/admin/ui";
import { AdminShell } from "../shell";
import { PayoutForm } from "./payout-form";

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const page = parsePage((await searchParams).page);
  const base = adminBase() === "/" ? "" : adminBase();

  const pricing = await getPricing();
  const rate = pricing.coinBahtRate;
  const db = getDb();
  const [[{ n: total }], rows, history] = await Promise.all([
    db.select({ n: count() }).from(morDus),
    db
      .select({
        userId: morDus.userId,
        name: morDus.displayName,
        payoutInfo: morDus.payoutInfo,
        earned: sql<number>`coalesce(sum(case when ${morDuLedger.amountCoins} > 0 then ${morDuLedger.amountCoins} else 0 end), 0)::int`,
        paidOut: sql<number>`coalesce(-sum(case when ${morDuLedger.amountCoins} < 0 then ${morDuLedger.amountCoins} else 0 end), 0)::int`,
        balance: sql<number>`coalesce(sum(${morDuLedger.amountCoins}), 0)::int`,
      })
      .from(morDus)
      .leftJoin(morDuLedger, eq(morDuLedger.morDuId, morDus.userId))
      .groupBy(morDus.userId, morDus.displayName, morDus.payoutInfo)
      .orderBy(desc(sql`coalesce(sum(${morDuLedger.amountCoins}), 0)`), morDus.displayName)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ l: morDuLedger, name: morDus.displayName })
      .from(morDuLedger)
      .leftJoin(morDus, eq(morDus.userId, morDuLedger.morDuId))
      .where(eq(morDuLedger.kind, "payout"))
      .orderBy(desc(morDuLedger.createdAt))
      .limit(10),
  ]);

  return (
    <AdminShell title="โอนเงินหมอดู" description={`รายได้ของหมอดูเป็น coin (หลังหักค่าบริการเว็บ ${pricing.morDuCommissionPercent}%) ตอนโอนเงินแปลงเป็นบาทที่อัตรา ฿${rate} ต่อ 1 coin (ตั้งได้ที่เมนู "ตั้งราคา") โอนออกนอกระบบตามช่องทางที่หมอดูแจ้ง แล้วบันทึกที่นี่เพื่อหักยอดคงเหลือ`}>
      <DataTable className="[&_table]:min-w-[860px]">
        <thead>
          <tr>
            <Th>หมอดู</Th>
            <Th>ช่องทางรับเงิน</Th>
            <Th className="text-right">รายได้สะสม (coin)</Th>
            <Th className="text-right">โอนแล้ว (coin)</Th>
            <Th className="text-right">คงเหลือ (coin)</Th>
            <Th className="text-right">≈ บาทที่ต้องโอน</Th>
            <Th className="text-right">บันทึกการโอน</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.userId}>
              <Td className="font-medium">{r.name}</Td>
              <Td className="max-w-[260px] whitespace-pre-line text-soft-text">{r.payoutInfo ?? <span className="text-muted-foreground">ยังไม่ได้กรอก</span>}</Td>
              <Td className="text-right">{r.earned.toLocaleString("th-TH")}</Td>
              <Td className="text-right text-muted-foreground">{r.paidOut.toLocaleString("th-TH")}</Td>
              <Td className="text-right font-bold text-primary">{r.balance.toLocaleString("th-TH")}</Td>
              <Td className="text-right whitespace-nowrap">{r.balance > 0 ? `฿${coinsToBaht(r.balance, rate).toLocaleString("th-TH")}` : <span className="text-muted-foreground">-</span>}</Td>
              <Td className="text-right">
                <div className="flex justify-end">{r.balance > 0 ? <PayoutForm morDuId={r.userId} balance={r.balance} rate={rate} /> : <span className="text-muted-foreground">-</span>}</div>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow cols={7}>ยังไม่มีหมอดู</EmptyRow>}
        </tbody>
      </DataTable>
      <Pagination page={page} total={total} path={`${base}/payouts`} />

      <p className="mt-3 text-xs text-muted-foreground">
        ยอดบาทคำนวณจากยอดคงเหลือ × ฿{rate} ปัดลงเป็นบาทเต็ม ถ้าโอนบางส่วน ใส่จำนวน coin ที่ต้องการหักในช่องบันทึก แล้วโอนเงินตามยอดบาทที่ระบบแสดงข้างช่อง
      </p>

      <h2 className="mt-8 mb-2 text-lg font-bold">การโอนล่าสุด</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>เวลา</Th>
            <Th>หมอดู</Th>
            <Th>หมายเหตุ</Th>
            <Th className="text-right">coin</Th>
          </tr>
        </thead>
        <tbody>
          {history.map(({ l, name }) => (
            <Tr key={l.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(l.createdAt)}</Td>
              <Td>{name ?? l.morDuId.slice(0, 8)}</Td>
              <Td className="text-muted-foreground">{l.note ?? "-"}</Td>
              <Td className="text-right font-semibold">{(-l.amountCoins).toLocaleString("th-TH")}</Td>
            </Tr>
          ))}
          {history.length === 0 && <EmptyRow cols={4}>ยังไม่มีการโอน</EmptyRow>}
        </tbody>
      </DataTable>
    </AdminShell>
  );
}

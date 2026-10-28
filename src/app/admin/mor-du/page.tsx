import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MorDuActions } from "./mor-du-actions";
import { AdminShell, FilterTabs } from "../shell";

const STATUSES = [
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "suspended", label: "ถูกพัก" },
  { value: "rejected", label: "ปฏิเสธ" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

export default async function AdminMorDuPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const raw = (await searchParams).status;
  const status: Status = STATUSES.find((s) => s.value === raw)?.value ?? "pending";

  const list = await getDb().select().from(morDus).where(eq(morDus.status, status)).orderBy(desc(morDus.createdAt)).limit(100);

  return (
    <AdminShell title="หมอดู">
      <FilterTabs base={`${adminBase()}/mor-du`} param="status" current={status} options={[...STATUSES]} />
      {list.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">ไม่มีรายการในสถานะนี้</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((m) => (
            <Card key={m.userId} className="bg-card">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-base text-foreground">{m.displayName}</p>
                  <MorDuActions userId={m.userId} status={status} />
                </div>
                <p className="text-sm text-muted-foreground">{m.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {m.specialties.split(",").map((s) => (
                    <Badge key={s} variant="secondary">
                      {s.trim()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ถามเป็นข้อ {m.priceQuestion} บาท
                  {m.priceLiveMinute ? ` · แชทสด ${m.priceLiveMinute} บาท/นาที` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

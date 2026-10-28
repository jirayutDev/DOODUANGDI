import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PaymentActions } from "./payment-actions";
import { AdminShell, FilterTabs } from "../shell";

const STATUSES = [
  { value: "pending", label: "รอชำระ" },
  { value: "awaiting_confirmation", label: "รอแอดมินตรวจ" },
  { value: "confirmed", label: "สำเร็จ" },
  { value: "rejected", label: "ปฏิเสธ/ยกเลิก" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const raw = (await searchParams).status;
  const status: Status = STATUSES.find((s) => s.value === raw)?.value ?? "awaiting_confirmation";

  const list = await getDb()
    .select()
    .from(payments)
    .where(eq(payments.status, status))
    .orderBy(desc(payments.createdAt))
    .limit(100);
  const actionable = status === "pending" || status === "awaiting_confirmation";

  return (
    <AdminShell title="การชำระเงิน">
      <FilterTabs base={`${adminBase()}/payments`} param="status" current={status} options={[...STATUSES]} />
      {list.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">ไม่มีรายการในสถานะนี้</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((p) => (
            <Card key={p.id} className="bg-card">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="text-sm">
                  <p className="font-display text-base text-foreground">
                    {p.purpose === "coin_topup" ? `เติม ${p.coins} coin` : "สมาชิก (เลิกให้บริการแล้ว)"} — {p.amountBaht} บาท
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ref: <span className="font-mono">{p.promptpayRef}</span> · user:{" "}
                    <span className="font-mono">{p.userId.slice(0, 8)}</span>
                  </p>
                  <Badge variant="outline" className="mt-1">
                    สร้างเมื่อ {new Date(p.createdAt).toLocaleString("th-TH")}
                  </Badge>
                </div>
                {actionable ? <PaymentActions paymentId={p.id} /> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {status === "pending" && (
        <p className="mt-4 text-xs text-muted-foreground">
          รายการรอชำระจะยืนยันเองเมื่อ Payso แจ้งว่าจ่ายแล้ว กดยืนยันมือเฉพาะเมื่อตรวจในระบบ Payso แล้วว่าเงินเข้าจริงแต่ระบบไม่เติมให้
        </p>
      )}
    </AdminShell>
  );
}

import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PaymentActions } from "./payment-actions";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) redirect("/");

  const db = getDb();
  const list = await db
    .select()
    .from(payments)
    .where(eq(payments.status, "awaiting_confirmation"))
    .orderBy(desc(payments.createdAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl text-foreground">ตรวจสอบการชำระเงิน</h1>

      {list.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">ไม่มีรายการรอตรวจสอบ</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((p) => (
            <Card key={p.id} className="bg-card">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="text-sm">
                  <p className="font-display text-base text-foreground">
                    {p.purpose === "ai_plus" ? "AI Plus" : "Mu Club"} — {p.amountBaht} บาท
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ref: <span className="font-mono">{p.promptpayRef}</span> · user:{" "}
                    <span className="font-mono">{p.userId.slice(0, 8)}</span>
                  </p>
                  <Badge variant="outline" className="mt-1">
                    แจ้งเมื่อ{" "}
                    {p.notifiedAt
                      ? new Date(p.notifiedAt).toLocaleString("th-TH")
                      : "-"}
                  </Badge>
                </div>
                <PaymentActions paymentId={p.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

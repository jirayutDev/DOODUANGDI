import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MorDuActions } from "./mor-du-actions";

export default async function AdminMorDuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) redirect("/");

  const db = getDb();
  const list = await db
    .select()
    .from(morDus)
    .where(eq(morDus.status, "pending"))
    .orderBy(desc(morDus.createdAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl text-foreground">อนุมัติหมอดู</h1>

      {list.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">ไม่มีใบสมัครรอตรวจสอบ</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((m) => (
            <Card key={m.userId} className="bg-card">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-base text-foreground">{m.displayName}</p>
                  <MorDuActions userId={m.userId} />
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
    </div>
  );
}

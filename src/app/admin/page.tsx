import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) redirect("/");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl text-foreground">แอดมิน</h1>
      <div className="grid gap-4">
        <Link href="/admin/payments">
          <Card className="bg-card transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="font-display text-lg">ตรวจสอบการชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              ยืนยันรายการสมัครสมาชิก AI Plus / Mu Club ที่แจ้งชำระเงินมา
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/mor-du">
          <Card className="bg-card transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="font-display text-lg">อนุมัติหมอดู</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              ตรวจสอบใบสมัครหมอดูใหม่ก่อนขึ้นแสดงในหน้าเลือกหมอดู
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

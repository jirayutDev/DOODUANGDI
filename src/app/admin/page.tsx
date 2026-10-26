import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { getAdminUser } from "@/lib/admin";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="px-[18px] pb-10 pt-4 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <h1 className="mb-8 font-display text-3xl text-foreground">แอดมิน</h1>
      <div className="grid gap-4">
        <Link href="/admin/payments">
          <Card className="bg-card transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="font-display text-lg">ตรวจสอบการชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              ยืนยันรายการเติม coin ที่แจ้งชำระเงินมา
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

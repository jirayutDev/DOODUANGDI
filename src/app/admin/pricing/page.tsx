import { requireAdminPage } from "@/lib/admin";
import { getPricing } from "@/lib/pricing";
import { AdminShell } from "../shell";
import { PricingForm } from "./pricing-form";

export default async function AdminPricingPage() {
  await requireAdminPage();
  const pricing = await getPricing();
  return (
    <AdminShell title="ตั้งราคา" description="แก้ราคา แพ็กเกจ โปรโมชัน และต้นทุน แล้วกดบันทึกที่แถบด้านล่าง ผู้ใช้เห็นภายใน 30 วินาที">
      <PricingForm initial={pricing} />
    </AdminShell>
  );
}

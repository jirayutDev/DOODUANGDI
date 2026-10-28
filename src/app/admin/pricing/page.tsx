import { requireAdminPage } from "@/lib/admin";
import { getPricing } from "@/lib/pricing";
import { AdminShell } from "../shell";
import { PricingForm } from "./pricing-form";

export default async function AdminPricingPage() {
  await requireAdminPage();
  const pricing = await getPricing();
  return (
    <AdminShell title="ตั้งราคา" description="แพ็กเกจเติม coin โปรโมชันการเติม ราคาแต่ละบริการ coin ต้อนรับ และค่าบริการ/อัตราแลก coin ของคิวหมอดู">
      <PricingForm initial={pricing} />
    </AdminShell>
  );
}

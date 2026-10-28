import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { morDus, payments } from "@/db/schema";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = { title: "หลังบ้าน · ดูดวงดิ", robots: { index: false, follow: false } };

// ป้ายตัวเลขเป็นของเสริม: ถ้าฐานข้อมูลช้า/ต่อไม่ได้ รอไม่เกิน 3 วินาทีแล้วข้ามไป ไม่ให้ทั้งหน้าค้างตาม
async function pendingBadges() {
  const empty = { payments: 0, morDu: 0 };
  try {
    const db = getDb();
    const query = Promise.all([
      db.select({ n: count() }).from(payments).where(eq(payments.status, "awaiting_confirmation")),
      db.select({ n: count() }).from(morDus).where(eq(morDus.status, "pending")),
    ]).then(([[pay], [mor]]) => ({ payments: pay.n, morDu: mor.n }));
    return await Promise.race([query, new Promise<typeof empty>((resolve) => setTimeout(() => resolve(empty), 3000))]);
  } catch {
    return empty;
  }
}

// โครงหลังบ้าน: เมนูด้านข้าง + พื้นที่เนื้อหา (ยังไม่ล็อกอินแสดงเฉพาะหน้า login ไม่มีเมนู)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminUser())) return <>{children}</>;
  const badges = await pendingBadges();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar base={adminBase() === "/" ? "" : adminBase()} badges={badges} />
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

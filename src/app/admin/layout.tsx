import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { morDus, payments } from "@/db/schema";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = { title: "หลังบ้าน · ดูดวงดิ", robots: { index: false, follow: false } };

async function pendingBadges() {
  try {
    const db = getDb();
    const [[pay], [mor]] = await Promise.all([
      db.select({ n: count() }).from(payments).where(eq(payments.status, "awaiting_confirmation")),
      db.select({ n: count() }).from(morDus).where(eq(morDus.status, "pending")),
    ]);
    return { payments: pay.n, morDu: mor.n };
  } catch {
    return { payments: 0, morDu: 0 };
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

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { adminBase } from "@/lib/admin-path";

// ใช้ในทุก route/หน้า admin: คืนข้อมูลแอดมินถ้ามีคุกกี้เซสชันที่ลงลายมือชื่อถูกและยังไม่หมดอายุ ไม่งั้น null
// (ล็อกอินที่ /api/admin/login ด้วย ADMIN_USERNAME + ADMIN_PASSWORD_HASH)
export async function getAdminUser(): Promise<{ id: "admin" } | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token) ? { id: "admin" } : null;
}

// สำหรับหน้า server ของแอดมิน: ไม่ได้ล็อกอินให้เด้งไปหน้า login ของ path ลับ
export async function requireAdminPage(): Promise<void> {
  if (!(await getAdminUser())) redirect(`${adminBase()}/login`);
}

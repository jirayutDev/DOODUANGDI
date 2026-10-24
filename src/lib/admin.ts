import { createClient } from "@/lib/supabase/server";

// เช็กสิทธิ์แอดมิน
// - ถ้าตั้ง ADMIN_USER_IDS (UUID ของ Supabase คั่นด้วยจุลภาค) จะใช้รายชื่อนี้อย่างเดียว ปลอดภัยที่สุด
// - ไม่งั้นใช้ ADMIN_EMAILS แต่ต้องเป็นอีเมลที่ยืนยันแล้วเท่านั้น (email_confirmed_at) กันคนสมัครด้วยอีเมลแอดมินแล้วได้สิทธิ์
function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

interface AdminCandidate {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}

export function isAdminUser(user: AdminCandidate | null | undefined): boolean {
  if (!user) return false;
  const ids = envList("ADMIN_USER_IDS");
  if (ids.length > 0) return ids.includes(user.id.toLowerCase());
  if (!user.email || !user.email_confirmed_at) return false;
  return envList("ADMIN_EMAILS").includes(user.email.toLowerCase());
}

// ใช้ในทุก route/หน้า admin: คืน user ถ้าเป็นแอดมิน ไม่งั้น null
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

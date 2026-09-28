// เช็กสิทธิ์แอดมินแบบง่าย ๆ ด้วยรายชื่ออีเมลใน env (ยังไม่มีระบบ role เต็มรูปแบบ)
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

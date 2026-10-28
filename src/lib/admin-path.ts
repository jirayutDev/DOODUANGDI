// path ลับของหน้าแอดมิน: ตั้งด้วย ADMIN_PATH (เช่น "k7x-panel-93fa") แล้วเข้าที่ /k7x-panel-93fa
// ไม่ตั้ง/รูปแบบไม่ถูก = ปิดหน้าแอดมินทั้งหมด (404) ไฟล์นี้ไม่ใช้ Node API เพื่อให้ proxy.ts import ได้
export function adminSlug(): string | null {
  const slug = (process.env.ADMIN_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9-]{8,48}$/.test(slug)) return null;
  if (["admin", "api", "login", "coins", "me"].includes(slug)) return null;
  return slug;
}

// ใช้ในหน้า server ของแอดมินเพื่อสร้างลิงก์/redirect ให้ตรงกับ path ลับ
export function adminBase(): string {
  const slug = adminSlug();
  return slug ? `/${slug}` : "/";
}

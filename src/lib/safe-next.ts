// อนุญาตเฉพาะ path ภายในเว็บเอง กัน open redirect (เช่น //evil.com, /\evil.com, https://evil.com)
export function safeNext(value: string | null | undefined, fallback = "/profile"): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.startsWith("/login")) {
    return value;
  }
  return fallback;
}

// ลิงก์ไปหน้า login พร้อมจำหน้าที่ต้องกลับมาหลังล็อกอิน
export function loginHref(next: string, mode?: "signup"): string {
  const params = new URLSearchParams({ next: safeNext(next) });
  if (mode) params.set("mode", mode);
  return `/login?${params.toString()}`;
}

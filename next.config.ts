import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy
// ข้อยอมรับ (compromise): script-src ต้องมี 'unsafe-inline' เพราะ Next.js ฝัง inline script สำหรับ hydration
// และเรายังไม่ใช้ nonce (nonce บังคับให้ทุกหน้า render แบบ dynamic) ส่วน dev ต้องมี 'unsafe-eval' สำหรับ React refresh
// style-src 'unsafe-inline' จำเป็นเพราะ Next/Tailwind/ส่วน UI ใช้ inline style
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws://localhost:*" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // face-reading ใช้กล้อง
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

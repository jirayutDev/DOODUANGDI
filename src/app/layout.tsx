// app/layout.tsx — โหลดฟอนต์ของธีมราตรีทอง และเปิดโหมดราตรีเป็นค่าเริ่มต้น
// เมนู/ท้ายเว็บของฝั่งผู้ใช้อยู่ที่ (site)/layout.tsx ส่วนหลังบ้านใช้โครงของตัวเองที่ admin/layout.tsx
import type { Metadata, Viewport } from "next";
import { Mali } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { CoinErrorDialog } from "@/components/coin-error-dialog";

// ฟอนต์เดียวทั้งเว็บ: Mali ลายมือกลมน่ารัก อ่านง่าย
const mali = Mali({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-mali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ดูดวงดิ",
  description: "มีเรื่องค้างใจ ถามได้เลย",
};

export const viewport: Viewport = {
  themeColor: "#16132e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      className={`dark ${mali.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Toaster />
        <CoinErrorDialog />
      </body>
    </html>
  );
}

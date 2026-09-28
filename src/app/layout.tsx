// app/layout.tsx — โหลดฟอนต์ของธีมราตรีทอง และเปิดโหมดราตรีเป็นค่าเริ่มต้น
import type { Metadata, Viewport } from "next";
import { Charm, Cormorant_Garamond, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

// หัวข้อภาษาไทย ลายมือแบบไทย ให้ความรู้สึกขลัง
const charm = Charm({
  weight: ["400", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-charm",
  display: "swap",
});

// เลขโรมันและชื่อไพ่ภาษาอังกฤษ
const cormorant = Cormorant_Garamond({
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

// เนื้อหาทั่วไป อ่านง่ายบนมือถือ
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-sans-thai",
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
      className={`dark ${charm.variable} ${cormorant.variable} ${notoSansThai.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © 2026 ดูดวงดิ (DOODUANGD) · มีเรื่องค้างใจ ถามได้เลย
        </footer>
        <Toaster />
      </body>
    </html>
  );
}

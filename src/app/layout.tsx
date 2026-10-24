// app/layout.tsx — โหลดฟอนต์ของธีมราตรีทอง และเปิดโหมดราตรีเป็นค่าเริ่มต้น
import type { Metadata, Viewport } from "next";
import { Charm, Cormorant_Garamond, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { BottomBar, SiteHeader } from "@/components/site-header";
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
        <footer className="bg-background pb-[72px] text-sm text-muted-foreground md:pb-0">
          <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-5 border-t border-border px-[18px] pt-[22px] pb-10 md:px-10">
            <span>© 2569 ดูดวงดิ · ดูเพื่อเป็นกำลังใจ ใช้วิจารณญาณประกอบนะ</span>
            <span className="flex gap-5">
              <a href="#">ติดต่อเรา</a>
              <a href="#">เงื่อนไข</a>
              <a href="#">ความเป็นส่วนตัว</a>
            </span>
          </div>
        </footer>
        <BottomBar />
        <Toaster />
      </body>
    </html>
  );
}

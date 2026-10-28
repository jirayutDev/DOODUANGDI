// app/layout.tsx — โหลดฟอนต์ของธีมราตรีทอง และเปิดโหมดราตรีเป็นค่าเริ่มต้น
import type { Metadata, Viewport } from "next";
import { Mali } from "next/font/google";
import "./globals.css";
import { BottomBar, SiteHeader } from "@/components/site-header";
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
        <CoinErrorDialog />
      </body>
    </html>
  );
}

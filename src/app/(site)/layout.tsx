import Link from "next/link";
import { BottomBar, SiteHeader } from "@/components/site-header";

// โครงหน้าเว็บฝั่งผู้ใช้: เมนูบน + ท้ายเว็บ + แถบล่างบนมือถือ (หน้าแอดมินไม่ใช้โครงนี้ ดู src/app/admin/layout.tsx)
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="bg-background pb-[72px] text-sm text-muted-foreground md:pb-0">
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-5 border-t border-border px-[18px] pt-[22px] pb-10 md:px-10">
          <span>© 2569 ดูดวงดิ · ดูเพื่อเป็นกำลังใจ ใช้วิจารณญาณประกอบนะ</span>
          <span className="flex gap-5">
            <Link href="/contact">ติดต่อเรา</Link>
            <Link href="/terms">เงื่อนไข</Link>
            <Link href="/privacy">ความเป็นส่วนตัว</Link>
          </span>
        </div>
      </footer>
      <BottomBar />
    </>
  );
}

import { LEGAL_UPDATED } from "@/lib/site-config";

// เปลือกหน้าเอกสารข้อความยาว (เงื่อนไข/ความเป็นส่วนตัว/ติดต่อ) ใช้ได้โดยไม่ต้องล็อกอิน
export function LegalPage({ title, updated = true, children }: { title: string; updated?: boolean; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[760px] px-[18px] pb-12 pt-4 md:px-10 md:pt-8">
      <h1 className="text-[28px] font-bold leading-[1.55] md:text-[40px]">{title}</h1>
      {updated && <p className="mt-1 text-sm text-muted-foreground">ปรับปรุงล่าสุด {LEGAL_UPDATED}</p>}
      <div className="mt-6 flex flex-col gap-3 text-soft-text [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </div>
  );
}

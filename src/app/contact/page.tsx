import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT } from "@/lib/site-config";

export const metadata: Metadata = { title: "ติดต่อเรา · ดูดวงดิ" };

export default function ContactPage() {
  const channels = [
    CONTACT.email && { label: "อีเมล", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    CONTACT.line && { label: "LINE", value: CONTACT.line, href: null },
    CONTACT.facebook && { label: "Facebook", value: CONTACT.facebook, href: CONTACT.facebook },
  ].filter(Boolean) as { label: string; value: string; href: string | null }[];

  return (
    <LegalPage title="ติดต่อเรา" updated={false}>
      <p>พบปัญหาการใช้งาน เติม coin แล้วไม่เข้า หรืออยากขอแก้ไข/ลบข้อมูลของคุณ ติดต่อเราได้ตามช่องทางด้านล่าง</p>
      {channels.length > 0 ? (
        <ul>
          {channels.map((c) => (
            <li key={c.label}>
              {c.label}:{" "}
              {c.href ? (
                <a href={c.href} className="text-primary underline underline-offset-4" target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                  {c.value}
                </a>
              ) : (
                <span className="text-foreground">{c.value}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">ช่องทางติดต่อกำลังจัดเตรียม ขออภัยในความไม่สะดวก</p>
      )}
      <p>
        เวลาแจ้งปัญหาเรื่องการชำระเงิน บอกเลขอ้างอิงรายการ (เห็นในหน้าเติม coin ตอนสแกนจ่าย) และเวลาที่โอนมาด้วย จะตรวจสอบได้เร็วขึ้น
      </p>
    </LegalPage>
  );
}

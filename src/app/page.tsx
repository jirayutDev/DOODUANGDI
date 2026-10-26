import Link from "next/link";
import Image from "next/image";
import { getDailyCard } from "@/lib/tarot-data";
import { FEATURE_COSTS } from "@/lib/coin-config";

const ASKS = ["คนคุยจะชัดเจนไหม", "สอบติดไหม", "ย้ายงานดีไหม", "เดือนนี้เงินเข้าไหม"];

const TOPICS = [
  { label: "ความรัก", blurb: "คนนี้ใช่ไหม เขาคิดยังไง", href: "/duang/love-daily", tone: "bg-primary text-primary-foreground" },
  { label: "การเรียน", blurb: "สอบ เกรด เลือกคณะ", href: "/duang/study", tone: "bg-cream text-ink" },
  { label: "การเงิน", blurb: "เงินเข้า เงินออก", href: "/duang/money", tone: "bg-secondary text-foreground" },
  { label: "ครอบครัว", blurb: "คนใกล้ตัวกับเรา", href: "/duang/family", tone: "bg-secondary text-foreground" },
];

const OTHERS = [
  { label: "จับคู่ความรัก", note: "ใส่วันเกิดสองคน", href: "/love-match" },
  { label: "เซียมซี", note: "เขย่าออนไลน์", href: "/sian-si" },
  { label: "โหงวเฮ้ง", note: "ถ่ายรูปหน้า", href: "/face-reading" },
  { label: "เลขศาสตร์", note: "จากวันเกิด", href: "/numerology" },
  { label: "ลูกเต๋าพยากรณ์", note: "ทอยได้วันละครั้ง", href: "/dice" },
  { label: "ดวงสมพงศ์", note: "วันนี้ใครหนุนเรา", href: "/duang/compatibility" },
];

const HIGHLIGHTS = [
  {
    title: "AI น้องมู รู้ดวงคุณจริง",
    body: "ถามได้ทุกเวลา ตอบจากวันเกิดของคุณโดยเฉพาะ อยากคุยลึกกว่านี้ส่งต่อหมอดูตัวจริงได้ในปุ่มเดียว",
  },
  {
    title: "ไพ่เทพฮินดู ไม่ซ้ำใคร",
    body: "ไพ่ประจำวันแบบแชร์ได้ วาดขึ้นเฉพาะที่นี่ที่เดียว หาที่ไหนไม่ได้อีกแล้ว",
  },
  {
    title: "เลือกหมอดูได้อย่างมั่นใจ",
    body: "ทุกคนผ่านการตรวจสอบตามมาตรฐาน Safe Mu พร้อมคะแนน \"แม่นไหม?\" จากคนที่เคยดูจริง",
  },
];

const sectionTitle = "text-[19px] font-bold leading-normal md:text-2xl";

export default function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const dailyCard = getDailyCard(today);

  return (
    <div className="mx-auto max-w-[1120px] pb-8 md:px-10">
      {/* hero + daily card */}
      <div className="md:grid md:grid-cols-[1.25fr_1fr] md:items-center md:gap-14 md:pt-6">
        <section className="px-[18px] pt-2 md:px-0 md:pt-0">
          <p className="text-sm text-muted-foreground md:text-base">สมัครฟรี · ถามน้องมูได้ทุกวัน</p>
          <h1 className="mt-1.5 font-display text-[44px] leading-[1.9] font-bold md:text-7xl">
            มีเรื่องค้างใจ <br className="md:hidden" />
            <span className="relative whitespace-nowrap text-primary">
              ถามได้เลย
              <svg
                aria-hidden="true"
                viewBox="0 0 200 14"
                preserveAspectRatio="none"
                className="absolute inset-x-0.5 bottom-0.5 h-3 w-full md:bottom-1.5 md:h-4"
              >
                <path
                  d="M2 9 C 40 3, 90 12, 130 6 S 185 5, 198 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <form
            action="/chat"
            className="mt-4 flex max-w-[600px] items-center gap-2 rounded-2xl bg-cream p-1.5 pl-4 md:mt-5 md:gap-2.5 md:p-2 md:pl-5"
          >
            <input
              type="text"
              name="q"
              aria-label="พิมพ์คำถาม"
              placeholder="เขาคิดยังไงกับเรา..."
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/50 md:h-12 md:text-lg"
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-ink px-4 font-semibold text-cream md:h-12 md:px-[22px]"
            >
              ถามน้องมู
            </button>
          </form>
          <div className="-mx-[18px] mt-2.5 flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] md:mx-0 md:mt-3 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {ASKS.map((a) => (
              <Link
                key={a}
                href="/chat"
                className="shrink-0 rounded-full border border-line-soft px-3 py-1.5 text-[16px] whitespace-nowrap text-soft-text hover:text-foreground md:px-3.5 md:text-sm"
              >
                {a}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-[18px] mt-7 grid grid-cols-[112px_1fr] items-start gap-4 rounded-[18px] bg-card p-4 md:mx-0 md:mt-0 md:grid-cols-[150px_1fr] md:gap-[22px] md:rounded-[22px] md:p-[22px]">
          <div className="relative aspect-[7/12] w-28 -rotate-3 overflow-hidden rounded-lg shadow-[0_10px_22px_rgba(0,0,0,0.45)] md:w-[150px]">
            <Image
              src={dailyCard.imageUrl}
              alt={`${dailyCard.nameTh} (${dailyCard.nameEn})`}
              fill
              sizes="(min-width: 768px) 150px, 112px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-[16px] text-muted-foreground md:text-sm">ไพ่ประจำวันนี้ของเธอ</p>
            <h2 className="mt-0.5 text-[21px] leading-normal font-bold md:text-[26px]">{dailyCard.nameTh}</h2>
            <p className="text-[16px] text-muted-foreground md:text-sm">{dailyCard.nameEn}</p>
            <p className="mt-2.5 text-sm leading-[1.9] md:mt-3 md:text-base">{dailyCard.keywords}</p>
            <Link
              href={`/tarot/${dailyCard.slug}`}
              className="mt-1 inline-flex min-h-10 items-center gap-1 font-semibold text-primary"
            >
              อ่านต่อ <span aria-hidden="true">›</span>
            </Link>
          </div>
        </section>
      </div>

      {/* topics */}
      <section className="px-[18px] pt-[30px] md:px-0 md:pt-16">
        <div className="flex items-baseline justify-between">
          <h2 className={sectionTitle}>ดูดวงเรื่องไหนดี</h2>
          <Link href="/duang" className="text-sm text-muted-foreground md:text-base">
            ทั้งหมด<span className="hidden md:inline"> ›</span>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-3.5 md:grid-cols-4 md:gap-3.5">
          {TOPICS.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`flex min-h-[92px] flex-col gap-0.5 rounded-[14px] p-3.5 md:min-h-[120px] md:gap-1 md:rounded-2xl md:p-5 ${t.tone}`}
            >
              <span className="text-[17px] font-bold md:text-xl">{t.label}</span>
              <span className="text-[16px] leading-normal opacity-80 md:text-sm">{t.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* chat teaser + other sciences */}
      <div className="md:grid md:grid-cols-[1.2fr_1fr] md:items-start md:gap-10 md:pt-16">
        <section className="px-[18px] pt-[30px] md:px-0 md:pt-0">
          <h2 className={sectionTitle}>คุยกับน้องมู</h2>
          <div className="mt-3 flex flex-col gap-2.5 rounded-[18px] bg-card p-4 md:mt-3.5 md:rounded-[20px] md:p-5">
            <p className="max-w-[78%] self-end rounded-[16px_16px_4px_16px] bg-line-soft px-3.5 py-[9px] text-sm md:max-w-[70%] md:px-4 md:py-2.5 md:text-base">
              เดือนนี้จะได้งานใหม่ไหม
            </p>
            <p className="max-w-[84%] self-start rounded-[16px_16px_16px_4px] bg-cream px-3.5 py-[9px] text-sm text-ink md:max-w-[78%] md:px-4 md:py-2.5 md:text-base">
              เปิดได้ไพ่ 8 ไม้เท้า ข่าวมาเร็วกว่าที่คิดเลย ช่วงกลางเดือนลองส่งใบสมัครที่ลังเลอยู่ดูนะ
            </p>
            <Link href="/chat" className="inline-flex min-h-10 items-center self-start font-semibold text-primary">
              เริ่มคุย ข้อละ {FEATURE_COSTS.chat.cost} coin <span aria-hidden="true">&nbsp;›</span>
            </Link>
          </div>
        </section>

        <section className="px-[18px] pt-[30px] md:px-0 md:pt-0">
          <h2 className={sectionTitle}>ศาสตร์อื่น</h2>
          <ul className="mt-2">
            {OTHERS.map((o) => (
              <li key={o.href} className="border-b border-border">
                <Link href={o.href} className="flex min-h-[52px] items-center justify-between md:min-h-[54px]">
                  <span>{o.label}</span>
                  <span className="text-[16px] text-muted-foreground md:text-sm">{o.note} ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* real fortune tellers */}
      <section className="mx-[18px] mt-[30px] flex items-center gap-3.5 rounded-[18px] border border-line-soft p-4 md:mx-0 md:mt-14 md:gap-[18px] md:rounded-[20px] md:px-[26px] md:py-[22px]">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-line-soft font-bold text-primary md:size-14 md:text-lg">
          อจ
        </span>
        <span className="flex flex-1 flex-col leading-normal">
          <span className="font-semibold md:text-lg">อยากคุยกับหมอดูตัวจริง</span>
          <span className="text-[16px] text-muted-foreground md:text-base">
            หมอดูทุกคนผ่านการตรวจสอบตามมาตรฐาน Safe Mu
          </span>
        </span>
        <Link
          href="/mor-du"
          className="shrink-0 rounded-[10px] bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground md:rounded-xl md:px-[22px] md:py-3 md:text-base md:font-bold"
        >
          ดูหมอดู
        </Link>
      </section>

      {/* existing highlights kept */}
      <section className="grid gap-3 px-[18px] pt-[30px] md:grid-cols-3 md:gap-3.5 md:px-0 md:pt-14">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="rounded-[14px] bg-card p-4 md:rounded-2xl md:p-5">
            <h3 className="font-display text-base leading-normal font-bold">{item.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

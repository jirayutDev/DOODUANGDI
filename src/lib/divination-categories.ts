// รวม "ทุกศาสตร์" ที่แบรนด์จะค่อยๆ เปิดให้บริการ — เขียนคำอธิบายเองในโทนน้องมู/ดูดวงดิ
// ไม่ได้ copy จากเว็บอื่น และจัดกลุ่มใหม่ตามวิธีที่แพลตฟอร์มนี้ให้บริการจริง (AI ตอบเองได้ vs ต้องหาหมอดูจริง)
export type DivinationMode = "ai" | "mor_du";
export type DivinationStatus = "live" | "coming_soon";

export interface DivinationCategory {
  slug: string;
  name: string;
  blurb: string;
  mode: DivinationMode;
  status: DivinationStatus;
  href: string; // ปลายทางจริง (ถ้ายัง coming_soon จะโชว์ badge ทับไว้ แต่ยังกดไปหน้าที่เกี่ยวข้องได้)
}

export interface DivinationGroup {
  title: string;
  categories: DivinationCategory[];
}

export const DIVINATION_GROUPS: DivinationGroup[] = [
  {
    title: "ดวงตามช่วงเวลา",
    categories: [
      { slug: "daily", name: "ดวงรายวัน", blurb: "เช็กพลังงานวันนี้ก่อนเริ่มวัน", mode: "ai", status: "live", href: "/daily-horoscope" },
      { slug: "weekly", name: "ดวงรายสัปดาห์", blurb: "จับทิศทาง 7 วันข้างหน้า", mode: "ai", status: "live", href: "/duang/weekly" },
      { slug: "biweekly", name: "ดวงรายปักษ์", blurb: "อัปเดตทุก 15 วัน ไม่พลาดจังหวะ", mode: "ai", status: "live", href: "/duang/biweekly" },
      { slug: "monthly", name: "ดวงรายเดือน", blurb: "วางแผนทั้งเดือนล่วงหน้า", mode: "ai", status: "live", href: "/duang/monthly" },
      { slug: "half-year-2569", name: "ดวงครึ่งปีหลัง 2569", blurb: "สรุปเทรนด์ชีวิตอีกครึ่งปี", mode: "ai", status: "live", href: "/duang/half-year-2569" },
      { slug: "year-2569", name: "ดวงปี 2569 ภาพรวม", blurb: "แผนที่ทั้งปีในหน้าเดียว", mode: "ai", status: "live", href: "/duang/year-2569" },
      { slug: "chinese-year-2569", name: "ดวงจีน 12 นักษัตร ปี 2569", blurb: "ปีนี้นักษัตรของคุณเป็นยังไง", mode: "ai", status: "live", href: "/duang/chinese-year-2569" },
    ],
  },
  {
    title: "ดวงเฉพาะเรื่อง",
    categories: [
      { slug: "love-daily", name: "ดวงความรักรายวัน", blurb: "หัวใจวันนี้เป็นไงบ้าง", mode: "ai", status: "live", href: "/duang/love-daily" },
      { slug: "love-monthly", name: "ดวงความรักรายเดือน", blurb: "ความสัมพันธ์เดือนนี้ไปทางไหน", mode: "ai", status: "live", href: "/duang/love-monthly" },
      { slug: "career", name: "ดวงการงาน อาชีพ", blurb: "งานที่ทำอยู่จะไปต่อไหม", mode: "ai", status: "live", href: "/duang/career" },
      { slug: "money", name: "ดวงการเงิน", blurb: "เงินทองเดือนนี้คล่องไหม", mode: "ai", status: "live", href: "/duang/money" },
      { slug: "study", name: "ดวงการเรียน", blurb: "ช่วงนี้เรื่องเรียน/สอบต้องระวังอะไร", mode: "ai", status: "live", href: "/duang/study" },
      { slug: "family", name: "ดวงครอบครัว บริวาร", blurb: "คนรอบตัวส่งผลกับเรายังไง", mode: "ai", status: "live", href: "/duang/family" },
      { slug: "fortune", name: "ดวงโชคลาภ", blurb: "จับพลังโชคช่วงนี้ (ไม่ทำนายตัวเลข)", mode: "ai", status: "live", href: "/duang/fortune" },
      { slug: "compatibility", name: "ดวงสมพงศ์ เนื้อคู่", blurb: "ราศีคุณกับเขาไปด้วยกันไหม", mode: "ai", status: "live", href: "/duang/compatibility" },
      { slug: "life-graph", name: "กราฟชีวิต", blurb: "เห็นจังหวะขึ้นลงของชีวิตในภาพเดียว", mode: "ai", status: "live", href: "/duang/life-graph" },
    ],
  },
  {
    title: "ไพ่เทพฮินดู (ไพ่ยิปซีฉบับแบรนด์เรา)",
    categories: [
      { slug: "tarot-daily", name: "ไพ่ประจำวัน", blurb: "เปิดไพ่ 1 ใบ รับพลังตอนเช้า", mode: "ai", status: "live", href: "/" },
      { slug: "tarot-timeline", name: "ไพ่ 3 ใบ อดีต-ปัจจุบัน-อนาคต", blurb: "เข้าใจเรื่องราวที่กำลังเป็นอยู่", mode: "ai", status: "live", href: "/reading" },
      { slug: "tarot-love", name: "ไพ่พีระมิดความรัก", blurb: "ดูความสัมพันธ์กับคนที่คุยอยู่", mode: "ai", status: "live", href: "/reading" },
      { slug: "tarot-celtic", name: "ไพ่เซลติกครอส", blurb: "ภาพรวมสถานการณ์แบบครบทุกมุม", mode: "ai", status: "live", href: "/reading" },
      { slug: "tarot-live", name: "ไพ่ยิปซีสายสด", blurb: "เปิดไพ่สดกับหมอดูตัวจริงผ่านวิดีโอ", mode: "mor_du", status: "coming_soon", href: "/mor-du" },
    ],
  },
  {
    title: "บุคลิกและลักษณะนิสัย",
    categories: [
      { slug: "birthday-personality", name: "นิสัยจากวันเกิด", blurb: "อุปนิสัยจากวันที่คุณลืมตาดูโลก", mode: "ai", status: "live", href: "/personality/day" },
      { slug: "zodiac-personality", name: "นิสัยตาม 12 ราศี", blurb: "แต่ละราศีมีเสน่ห์ต่างกันยังไง", mode: "ai", status: "live", href: "/personality/zodiac" },
      { slug: "nakshatra-personality", name: "นิสัยตาม 12 นักษัตร", blurb: "คนเกิดปีนักษัตรเดียวกันเหมือนกันไหม", mode: "ai", status: "live", href: "/personality/nakshatra" },
    ],
  },
  {
    title: "ศาสตร์เสี่ยงทาย",
    categories: [
      { slug: "sian-si", name: "เซียมซี", blurb: "เขย่ากระบอกขอคำตอบจากฟ้า (โครงสร้าง 28 เบอร์ตามธรรมเนียม)", mode: "ai", status: "live", href: "/sian-si" },
      { slug: "dice", name: "ลูกเต๋าพยากรณ์", blurb: "ทอยเต๋า 2 ลูกถามใจตัวเอง ตามวิธีตำราลูกเต๋าพยากรณ์", mode: "ai", status: "live", href: "/dice" },
      { slug: "oracle", name: "ไพ่ออราเคิลโบราณ", blurb: "ต้องใช้สำรับไพ่ออราเคิลของหมอดูที่มีตำรารองรับจริง", mode: "mor_du", status: "live", href: "/mor-du" },
    ],
  },
  {
    title: "เลขศาสตร์",
    categories: [
      { slug: "phone-numerology", name: "เบอร์มงคล", blurb: "เช็กเบอร์โทรก่อนตัดสินใจเปลี่ยนค่าย", mode: "ai", status: "live", href: "/numerology" },
      { slug: "plate-numerology", name: "ทะเบียนรถมงคล", blurb: "เลือกเลขทะเบียนให้ถูกโฉลก", mode: "ai", status: "live", href: "/numerology" },
    ],
  },
  {
    title: "นามศาสตร์",
    categories: [
      { slug: "name-analysis", name: "วิเคราะห์ชื่อ", blurb: "ชื่อที่ใช้อยู่ส่งผลกับดวงยังไง", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "rename", name: "ตั้งชื่อ เปลี่ยนชื่อ", blurb: "อยากเปลี่ยนชื่อให้ถูกหลักทักษา ต้องผู้เชี่ยวชาญ", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "nickname", name: "ตั้งชื่อเล่น", blurb: "หาชื่อเล่นให้ลูกน้อยตามหลักทักษา", mode: "mor_du", status: "live", href: "/mor-du" },
    ],
  },
  {
    title: "ตำราเฉพาะทาง — แนะนำหมอดูตัวจริง",
    categories: [
      { slug: "thai-astrology", name: "โหราศาสตร์ไทย ผูกดวง", blurb: "พื้นดวง ดวงจร แบบตำราไทยแท้", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "western-astrology", name: "โหราศาสตร์สากล", blurb: "อ่านพื้นดวงแบบสากล", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "uranian-astrology", name: "โหราศาสตร์ยูเรเนียน", blurb: "คำนวณละเอียดสายยูเรเนียน", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "vedic-astrology", name: "โหราศาสตร์พระเวท", blurb: "ตำราพระเวท วิมโสตรีทศา", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "ten-ascendants", name: "10 ลัคนา", blurb: "ผูกดวงตามหลัก 10 ลัคน์", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "maha-taksa", name: "มหาทักษาเทวดาเสวยอายุ", blurb: "ดาวพระเคราะห์ดวงไหนเสวยแทรกอยู่", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "three-tier-throne", name: "ฉัตรสามชั้น", blurb: "ตำราโบราณที่หมอดูรุ่นใหญ่ยังใช้", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "seven-digit-nine-base", name: "เลข 7 ตัว 9 ฐาน", blurb: "ศาสตร์วันเดือนปีเกิดที่ต้องแม่นตามตำรา", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "palmistry", name: "ดูลายมือ", blurb: "เส้นในฝ่ามือบอกอะไรได้บ้าง", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "atthakala", name: "ยามอัฏฐกาล (ยามสามตา)", blurb: "ทายเหตุการณ์เฉพาะหน้า ของหาย", mode: "mor_du", status: "live", href: "/mor-du" },
      { slug: "mole-reading", name: "ทำนายไฝ", blurb: "ไฝตำแหน่งไหนให้คุณ ตำแหน่งไหนให้ระวัง", mode: "mor_du", status: "live", href: "/mor-du" },
    ],
  },
  {
    title: "อื่นๆ",
    categories: [
      { slug: "dream", name: "ทำนายฝัน", blurb: "ฝันเมื่อคืนแปลว่าอะไร ถามน้องมูได้เลย", mode: "ai", status: "live", href: "/chat" },
    ],
  },
];

export const ALL_DIVINATION_CATEGORIES: DivinationCategory[] = DIVINATION_GROUPS.flatMap(
  (g) => g.categories
);

// กติกาและตรรกะราคาของระบบจองคิวปรึกษาหมอดู (ฟังก์ชันล้วน ทดสอบได้ ไม่แตะฐานข้อมูล)

export const BOOKING_DURATIONS = [15, 30, 45, 60] as const;
export type BookingDuration = (typeof BOOKING_DURATIONS)[number];

export const MIN_LEAD_MS = 2 * 60 * 60 * 1000; // ขอคิวล่วงหน้าอย่างน้อย 2 ชั่วโมง
export const MAX_AHEAD_MS = 60 * 24 * 60 * 60 * 1000; // ไม่เกิน 60 วันข้างหน้า

// ส่วนที่เว็บเก็บจากราคาที่ลูกค้าจ่าย (%) ตั้งด้วย env MORDU_COMMISSION_PERCENT ค่าเริ่มต้น 20
export function commissionPercent(): number {
  const n = Number(process.env.MORDU_COMMISSION_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 90 ? n : 20;
}

export function priceFor(perMinuteBaht: number, durationMin: number): number {
  return Math.round(perMinuteBaht * durationMin);
}

// แบ่งเงิน: เว็บเก็บค่าคอมมิชชันปัดลงเป็นบาทเต็ม ที่เหลือเป็นรายได้หมอดู (รวมกันได้เท่าราคาเสมอ)
export function splitPrice(priceBaht: number, percent = commissionPercent()): { commissionBaht: number; morDuBaht: number } {
  const commissionBaht = Math.floor((priceBaht * percent) / 100);
  return { commissionBaht, morDuBaht: priceBaht - commissionBaht };
}

export type StartCheck = { ok: true } | { ok: false; reason: string };

export function checkStartTime(startsAt: Date, now = Date.now()): StartCheck {
  const t = startsAt.getTime();
  if (!Number.isFinite(t)) return { ok: false, reason: "เวลาไม่ถูกต้อง" };
  if (t < now + MIN_LEAD_MS) return { ok: false, reason: "ต้องขอคิวล่วงหน้าอย่างน้อย 2 ชั่วโมง" };
  if (t > now + MAX_AHEAD_MS) return { ok: false, reason: "ขอคิวล่วงหน้าได้ไม่เกิน 60 วัน" };
  return { ok: true };
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  requested: { label: "รอหมอดูตอบรับ", tone: "warning" },
  accepted: { label: "รอชำระเงิน", tone: "warning" },
  declined: { label: "หมอดูปฏิเสธ", tone: "danger" },
  paid: { label: "ชำระแล้ว", tone: "success" },
  completed: { label: "เสร็จสิ้น", tone: "neutral" },
  cancelled: { label: "ยกเลิก", tone: "danger" },
};

// ลิงก์ที่หมอดูวางเองได้ ต้องเป็นห้อง Google Meet เท่านั้น (กันวางลิงก์อื่น/ฟิชชิง)
export function isMeetUrl(v: string): boolean {
  return /^https:\/\/meet\.google\.com\/[a-z0-9-]{3,40}(\?[^\s]*)?$/i.test(v.trim());
}

// ค่าจาก <input type="datetime-local"> (เวลาไทย) -> Date ที่ถูกต้อง
export function thaiLocalToDate(local: string): Date {
  return new Date(`${local}:00+07:00`);
}

// แสดงเวลาเป็นเวลาไทยเสมอ (เซิร์ฟเวอร์ส่วนใหญ่ใช้เวลา UTC ถ้าไม่ระบุโซนจะเพี้ยน 7 ชั่วโมง)
export function fmtThaiDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

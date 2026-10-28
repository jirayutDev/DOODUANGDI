// ตัวช่วยอ่านค่าตัวกรองจาก ?query ของหน้าหลังบ้าน (ฟังก์ชันล้วน ทดสอบได้) ค่าที่ผิดรูปแบบถูกมองเป็น "ไม่กรอง" ไม่ทำให้หน้าพัง

const DAY = 86_400_000;
const BKK = 7 * 3_600_000;

// ข้อความค้นหา: ตัดช่องว่าง จำกัดความยาว ว่าง = ไม่กรอง
export function cleanText(raw: string | undefined, max = 60): string {
  return (raw ?? "").trim().slice(0, max);
}

// escape เครื่องหมายพิเศษของ LIKE/ILIKE (% _ \) เพื่อให้ค้นเป็นข้อความธรรมดา
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

export function pickOne<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === raw);
}

// วันที่รูปแบบ YYYY-MM-DD ตามเวลาไทย -> เวลาเริ่มวัน (00:00 ไทย) เป็น Date; ผิดรูปแบบ = undefined
export function thaiDayStart(ymd: string | undefined): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (!Number.isFinite(t)) return undefined;
  return new Date(t - BKK);
}

// สิ้นสุดวันที่เลือก (เริ่มวันถัดไป ใช้เป็นขอบบนแบบ "น้อยกว่า")
export function thaiDayEndExclusive(ymd: string | undefined): Date | undefined {
  const s = thaiDayStart(ymd);
  return s ? new Date(s.getTime() + DAY) : undefined;
}

// ตัวกรองทั้งหมดที่ใช้อยู่ (ไม่นับหน้า) ใช้ส่งต่อให้ Pagination และนับป้าย "กำลังกรอง N รายการ"
export function activeFilters(values: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== "" && k !== "page") out[k] = v;
  return out;
}

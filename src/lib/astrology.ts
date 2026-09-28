// คำนวณดวงโปรไฟล์เบื้องต้นจากวันเกิด (ไม่ต้องใช้ Swiss Ephemeris)
// อิงเฉพาะ วัน/เดือน/ปี — เวลาเกิด+จังหวัดเก็บไว้รอเฟสที่คำนวณลัคนาแบบเต็ม

const ZODIAC_RANGES: { sign: string; endMonth: number; endDay: number }[] = [
  { sign: "มังกร", endMonth: 1, endDay: 19 },
  { sign: "กุมภ์", endMonth: 2, endDay: 18 },
  { sign: "มีน", endMonth: 3, endDay: 20 },
  { sign: "เมษ", endMonth: 4, endDay: 19 },
  { sign: "พฤษภ", endMonth: 5, endDay: 20 },
  { sign: "เมถุน", endMonth: 6, endDay: 20 },
  { sign: "กรกฎ", endMonth: 7, endDay: 22 },
  { sign: "สิงห์", endMonth: 8, endDay: 22 },
  { sign: "กันย์", endMonth: 9, endDay: 22 },
  { sign: "ตุลย์", endMonth: 10, endDay: 22 },
  { sign: "พิจิก", endMonth: 11, endDay: 21 },
  { sign: "ธนู", endMonth: 12, endDay: 21 },
  { sign: "มังกร", endMonth: 12, endDay: 31 },
];

export const ZODIAC_SIGN_NAMES = [
  "เมษ",
  "พฤษภ",
  "เมถุน",
  "กรกฎ",
  "สิงห์",
  "กันย์",
  "ตุลย์",
  "พิจิก",
  "ธนู",
  "มังกร",
  "กุมภ์",
  "มีน",
];

export function getZodiacSign(birthDate: Date): string {
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  for (const range of ZODIAC_RANGES) {
    if (month < range.endMonth || (month === range.endMonth && day <= range.endDay)) {
      return range.sign;
    }
  }
  return "มังกร";
}

const THAI_DAYS = [
  { name: "อาทิตย์", color: "สีแดง" },
  { name: "จันทร์", color: "สีเหลือง" },
  { name: "อังคาร", color: "สีชมพู" },
  { name: "พุธ", color: "สีเขียว" },
  { name: "พฤหัสบดี", color: "สีส้ม" },
  { name: "ศุกร์", color: "สีฟ้า" },
  { name: "เสาร์", color: "สีม่วง" },
] as const;

export function getThaiBirthDay(birthDate: Date): string {
  return THAI_DAYS[birthDate.getDay()].name;
}

export function getLuckyColor(birthDate: Date): string {
  return THAI_DAYS[birthDate.getDay()].color;
}

// ใช้กับเครื่องมือ "ดูดวงรายวัน" ที่เลือกแค่วันเกิด (ไม่ต้องกรอกวันที่เต็ม)
export function getThaiDayInfo(dayIndex: number): { name: string; color: string } {
  return THAI_DAYS[((dayIndex % 7) + 7) % 7];
}

export const THAI_DAY_NAMES = THAI_DAYS.map((d) => d.name);

export const CHINESE_ZODIAC = [
  "ชวด (หนู)",
  "ฉลู (วัว)",
  "ขาล (เสือ)",
  "เถาะ (กระต่าย)",
  "มะโรง (งูใหญ่)",
  "มะเส็ง (งูเล็ก)",
  "มะเมีย (ม้า)",
  "มะแม (แพะ)",
  "วอก (ลิง)",
  "ระกา (ไก่)",
  "จอ (หมา)",
  "กุน (หมู)",
];

export function getChineseZodiac(birthDate: Date): string {
  // ปีนักษัตรจีนเปลี่ยนปีช่วงตรุษจีน (ม.ค.-ก.พ.) แต่ MVP ประมาณด้วยปีสากลก่อน
  const index = (birthDate.getFullYear() - 4) % 12;
  return CHINESE_ZODIAC[(index + 12) % 12];
}

// เลขศาสตร์: บวกเลขวันเกิดทั้งหมดจนเหลือหลักเดียว (ยกเว้นเลขมาสเตอร์ 11, 22)
export function getLifePathNumber(birthDate: Date): number {
  const digits = `${birthDate.getFullYear()}${birthDate.getMonth() + 1}${birthDate.getDate()}`
    .split("")
    .map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 22 && sum !== 11 && sum !== 22) {
    sum = String(sum)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return sum;
}

export interface BirthProfile {
  zodiacSign: string;
  thaiBirthDay: string;
  luckyColor: string;
  chineseZodiac: string;
  lifePathNumber: number;
}

export function calculateBirthProfile(birthDateStr: string): BirthProfile {
  const birthDate = new Date(`${birthDateStr}T00:00:00`);
  return {
    zodiacSign: getZodiacSign(birthDate),
    thaiBirthDay: getThaiBirthDay(birthDate),
    luckyColor: getLuckyColor(birthDate),
    chineseZodiac: getChineseZodiac(birthDate),
    lifePathNumber: getLifePathNumber(birthDate),
  };
}

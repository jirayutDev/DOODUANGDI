// เลขศาสตร์ผลรวม — บวกเลขทุกหลักจนเหลือหลักเดียว (เลขฐานราก) แล้วดูความหมายต่อเลข
// ใช้กับเบอร์โทรศัพท์และทะเบียนรถ คำอธิบายเขียนเองในโทนน้องมู
export const DIGIT_ROOT_MEANINGS: Record<number, { title: string; meaning: string }> = {
  1: { title: "เลขผู้นำ", meaning: "ส่งเสริมความเป็นผู้นำ ความมั่นใจ กล้าตัดสินใจ" },
  2: { title: "เลขความสัมพันธ์", meaning: "เสริมเรื่องคนรอบข้าง การเจรจา และความร่วมมือ" },
  3: { title: "เลขความคิดสร้างสรรค์", meaning: "เอื้อต่อการสื่อสาร ไอเดียใหม่ๆ และงานที่ต้องใช้ความคิด" },
  4: { title: "เลขความมั่นคง", meaning: "เสริมความมั่นคง การวางแผน และวินัยในการทำงาน" },
  5: { title: "เลขการเปลี่ยนแปลง", meaning: "เอื้อต่อการเดินทาง ความยืดหยุ่น และโอกาสใหม่ๆ" },
  6: { title: "เลขครอบครัว", meaning: "ส่งเสริมความอบอุ่นในครอบครัวและความรับผิดชอบ" },
  7: { title: "เลขสติปัญญา", meaning: "เอื้อต่อการเรียนรู้ การคิดวิเคราะห์ และความสงบภายใน" },
  8: { title: "เลขโภคทรัพย์", meaning: "เสริมเรื่องการเงิน การงาน และความก้าวหน้า" },
  9: { title: "เลขความสำเร็จ", meaning: "ส่งเสริมการปิดจบสิ่งค้างคาและเริ่มบทใหม่ที่ดีกว่า" },
};

export function digitalRoot(input: string): number {
  const digits = input.replace(/\D/g, "");
  let sum = digits.split("").reduce((a, b) => a + Number(b), 0);
  while (sum > 9) {
    sum = String(sum)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return sum || 0;
}

export function analyzeNumber(input: string) {
  const digits = input.replace(/\D/g, "");
  const root = digitalRoot(digits);
  const info = DIGIT_ROOT_MEANINGS[root] ?? { title: "-", meaning: "กรอกตัวเลขอย่างน้อย 1 หลัก" };
  return { digits, root, ...info };
}

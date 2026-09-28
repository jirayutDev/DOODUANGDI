// สร้าง PromptPay QR payload ตามมาตรฐาน EMV QR Code for Payment Systems
// ไม่ต้องพึ่ง payment gateway ภายนอก ใช้เบอร์พร้อมเพย์/เลขบัตรประชาชนของร้านสร้าง QR ได้เลย
// อ้างอิงสเปค: ธนาคารแห่งประเทศไทย/สมาคมธนาคารไทย (Thai QR Payment Standard)

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

// CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflect, no xor-out
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizeTarget(target: string): { subId: "01" | "02"; value: string } {
  const digits = target.replace(/\D/g, "");

  if (digits.length === 13) {
    // เลขประจำตัวผู้เสียภาษี / บัตรประชาชน
    return { subId: "02", value: digits };
  }

  // เบอร์โทรศัพท์ไทย: ตัด 0 นำหน้าออก แล้วขึ้นต้นด้วยรหัสประเทศ 66 รวมเป็น 13 หลัก
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  return { subId: "01", value: `66${withoutLeadingZero}`.padStart(13, "0") };
}

/**
 * สร้าง payload string สำหรับ PromptPay QR
 * @param target เบอร์พร้อมเพย์ (เช่น 0812345678) หรือเลขประจำตัว 13 หลัก
 * @param amount จำนวนเงินบาท (ใส่ = QR แบบระบุยอดตายตัว, ไม่ใส่ = ผู้จ่ายกรอกยอดเอง)
 * @param ref เลขอ้างอิงการชำระเงิน (ฝัง Bill Number ไว้ในทัก 62 — แอปธนาคารบางเจ้าโชว์ให้เห็นตอนสแกน)
 */
export function generatePromptPayPayload(target: string, amount?: number, ref?: string): string {
  const { subId, value } = normalizeTarget(target);

  const merchantAccountInfo = [tlv("00", "A000000677010111"), tlv(subId, value)].join("");
  const additionalData = ref ? tlv("62", tlv("01", ref)) : "";

  const parts = [
    tlv("00", "01"), // Payload Format Indicator
    tlv("01", amount ? "12" : "11"), // Point of Initiation Method: 12 = dynamic (มีจำนวนเงิน), 11 = static
    tlv("29", merchantAccountInfo),
    tlv("52", "0000"), // Merchant Category Code
    tlv("53", "764"), // Currency: THB
    ...(amount ? [tlv("54", amount.toFixed(2))] : []),
    tlv("58", "TH"),
    additionalData,
  ].join("");

  const withCrcPlaceholder = `${parts}6304`;
  return `${withCrcPlaceholder}${crc16(withCrcPlaceholder)}`;
}

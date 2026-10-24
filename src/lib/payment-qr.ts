import QRCode from "qrcode";
import { generateQrPayloadViaSlip2Go } from "@/lib/slip2go";
import { generatePromptPayPayload } from "@/lib/promptpay";

// QR รับเงินเข้าบัญชีเรา: ใช้ Slip2Go ถ้าตั้งค่าครบ ไม่งั้น (หรือเรียกไม่สำเร็จ) สร้างเองจากเลขพร้อมเพย์
export async function createPaymentQrDataUrl(promptpayId: string, amountBaht: number, ref: string) {
  const payload =
    (await generateQrPayloadViaSlip2Go(amountBaht)) ?? generatePromptPayPayload(promptpayId, amountBaht, ref);
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
}

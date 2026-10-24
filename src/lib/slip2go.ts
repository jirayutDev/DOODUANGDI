// ตรวจสลิปโอนเงินด้วย Slip2Go (https://slip2go.com/guide/rest-api/qr-image)
// env: SLIP2GO_API_URL = base URL ของบัญชีเรา (ดูในแดชบอร์ด app.slip2go.com), SLIP2GO_SECRET = Secret Key
// ถ้าไม่ได้ตั้งค่า ระบบจะถอยกลับไปใช้ flow เดิม (ผู้ใช้กดแจ้งชำระ + แอดมินยืนยันมือ)

// fail closed: ต้องตั้งผู้รับเงินครบด้วย ไม่งั้นถือว่า flow ตรวจสลิปอัตโนมัติใช้ไม่ได้ (ถอยไป flow แอดมินยืนยัน)
export function isSlip2GoConfigured(): boolean {
  return (
    !!process.env.SLIP2GO_API_URL &&
    !!process.env.SLIP2GO_SECRET &&
    !!process.env.SLIP2GO_RECEIVER_TYPE &&
    !!process.env.SLIP2GO_RECEIVER_ACCOUNT
  );
}

const FETCH_TIMEOUT_MS = 10000;

function digits(s: unknown): string {
  return typeof s === "string" ? s.replace(/\D/g, "") : "";
}

// เลขบัญชีในสลิปมักถูกปิดบางส่วน (xxx-x-x1234-x) เทียบเฉพาะตัวเลขที่เห็นเป็น suffix ของเลขที่ตั้งไว้
function receiverMatches(shown: unknown, expected: string): boolean {
  const a = digits(shown);
  const e = digits(expected);
  if (a.length < 3 || !e) return false;
  return e.endsWith(a) || a.endsWith(e) || e.includes(a);
}

export type SlipVerifyResult =
  | { ok: true; transRef: string; amount: number }
  | { ok: false; message: string };

interface Slip2GoResponse {
  code?: string;
  message?: string;
  data?: {
    transRef?: string;
    amount?: number;
    receiver?: {
      account?: { bank?: { account?: string }; proxy?: { account?: string } };
    };
  };
}

const GENERIC_FAIL = "ตรวจสลิปไม่ผ่าน กรุณาตรวจสอบว่าเป็นสลิปที่โอนตามยอดและบัญชีที่ถูกต้อง";

export async function verifySlipImage(
  file: Blob,
  opts: { amountBaht: number; notBefore: Date }
): Promise<SlipVerifyResult> {
  const base = process.env.SLIP2GO_API_URL!.replace(/\/+$/, "");

  const checkCondition: Record<string, unknown> = {
    checkDuplicate: true,
    checkAmount: { type: "eq", amount: String(opts.amountBaht) },
    // สลิปต้องโอนหลังสร้างรายการ (เผื่อเวลาเครื่อง/ธนาคารเหลื่อม 5 นาที)
    checkDate: { type: "gte", date: new Date(opts.notBefore.getTime() - 5 * 60 * 1000).toISOString() },
  };
  // ตรวจผู้รับเงินเสมอ เช่น SLIP2GO_RECEIVER_TYPE=02001 (พร้อมเพย์เบอร์มือถือ) SLIP2GO_RECEIVER_ACCOUNT=เลขบัญชี/เบอร์
  const receiverType = process.env.SLIP2GO_RECEIVER_TYPE;
  const receiverAccount = process.env.SLIP2GO_RECEIVER_ACCOUNT;
  if (!receiverType || !receiverAccount) {
    return { ok: false, message: GENERIC_FAIL };
  }
  checkCondition.checkReceiver = [{ accountType: receiverType, accountNumber: receiverAccount }];

  const form = new FormData();
  form.append("file", file, "slip.jpg");
  form.append("payload", JSON.stringify({ checkCondition }));

  let res: Response;
  try {
    res = await fetch(`${base}/api/verify-slip/qr-image/info`, {
      method: "POST",
      headers: { Authorization: process.env.SLIP2GO_SECRET! },
      body: form,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, message: "เชื่อมต่อระบบตรวจสลิปไม่ได้ ลองใหม่อีกครั้งนะ" };
  }

  const json = (await res.json().catch(() => null)) as Slip2GoResponse | null;
  // เอกสารระบุเฉพาะรหัสสำเร็จ "200000" — รหัสอื่นทั้งหมดถือว่าไม่ผ่าน
  if (json?.code !== "200000" || !json.data?.transRef || typeof json.data.amount !== "number") {
    const msg = String(json?.message ?? "").toLowerCase();
    if (msg.includes("duplicate")) return { ok: false, message: "สลิปนี้ถูกใช้ไปแล้ว" };
    return { ok: false, message: GENERIC_FAIL };
  }
  // ตรวจผู้รับเองซ้ำ เมื่อ response ระบุข้อมูลผู้รับมา
  const acc = json.data.receiver?.account;
  const shown = [acc?.bank?.account, acc?.proxy?.account].filter((x): x is string => !!x);
  if (shown.length > 0 && !shown.some((x) => receiverMatches(x, receiverAccount))) {
    return { ok: false, message: GENERIC_FAIL };
  }
  if (json.data.amount !== opts.amountBaht) {
    return { ok: false, message: "ยอดในสลิปไม่ตรงกับรายการ" };
  }
  return { ok: true, transRef: json.data.transRef, amount: json.data.amount };
}

// ---------- สร้าง PromptPay QR จากบัญชีของเรา (https://slip2go.com/guide/rest-api/promptpay-qr) ----------
// env เพิ่มเติม: PROMPTPAY_ID (เลขพร้อมเพย์), SLIP2GO_PROMPTPAY_TYPE = phone_number | citizen_id | e_wallet, SLIP2GO_ACCOUNT_NAME = ชื่อบัญชีผู้รับ
export function canGenerateQrViaSlip2Go(): boolean {
  return (
    isSlip2GoConfigured() &&
    !!process.env.PROMPTPAY_ID &&
    !!process.env.SLIP2GO_PROMPTPAY_TYPE &&
    !!process.env.SLIP2GO_ACCOUNT_NAME
  );
}

// คืนสตริง payload ของ QR (ใช้วาดเป็นภาพเอง) หรือ null เมื่อเรียกไม่สำเร็จ เพื่อให้ผู้เรียกถอยไปใช้ตัวสร้างในเครื่อง
export async function generateQrPayloadViaSlip2Go(amountBaht: number): Promise<string | null> {
  if (!canGenerateQrViaSlip2Go()) return null;
  const base = process.env.SLIP2GO_API_URL!.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/qr-payment/generate-qr-code`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: process.env.SLIP2GO_SECRET! },
      body: JSON.stringify({
        promptPayCode: process.env.PROMPTPAY_ID,
        promptPayType: process.env.SLIP2GO_PROMPTPAY_TYPE,
        accountName: process.env.SLIP2GO_ACCOUNT_NAME,
        amount: amountBaht.toFixed(2),
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as { code?: string; data?: { qrCode?: string } } | null;
    return json?.code === "200" && json.data?.qrCode ? json.data.qrCode : null;
  } catch {
    return null;
  }
}

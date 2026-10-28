// ส่ง SMS ด้วย SMSKUB (https://sms-kub.com) ตามเอกสาร Postman "smskub-customer": POST {baseUrl}/api/messages (ส่งด่วน)
// env: SMSKUB_BASE_URL (URL ของ API จากหน้า console), SMSKUB_API_KEY (โทเคนจาก console), SMSKUB_SENDER (ชื่อผู้ส่ง อังกฤษ/ตัวเลข ไม่เกิน 11 ตัว)
// เอกสารระบุการยืนยันตัวตนแบบ API key โดยชื่อคีย์คือ "key" — ส่งเป็น header ตามค่าปกติของ Postman ถ้าทดสอบจริงแล้วไม่ผ่าน ให้เช็กตำแหน่ง/ชื่อ header กับ SMSKUB
const TIMEOUT_MS = 10_000;

export function isSmsKubConfigured(): boolean {
  return /^https:\/\/[^\s/]+/.test(process.env.SMSKUB_BASE_URL ?? "") && !!process.env.SMSKUB_API_KEY && /^[A-Za-z0-9]{1,11}$/.test(process.env.SMSKUB_SENDER ?? "");
}

// Supabase ส่งเบอร์มาเป็นรูปแบบสากล (เช่น 66812345678 หรือ +66812345678) แปลงเป็นเบอร์ไทยแบบ 0812345678
// คืน null ถ้าไม่ใช่เบอร์มือถือไทย (จำกัดเฉพาะไทยเพื่อกันถูกใช้ส่ง SMS ไปต่างประเทศที่แพงและเสี่ยงโดนแอบใช้)
export function toThaiLocalPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  const m = /^66([689]\d{8})$/.exec(digits);
  if (m) return `0${m[1]}`;
  return /^0[689]\d{8}$/.test(digits) ? digits : null;
}

export async function sendSms(phoneLocal: string, message: string): Promise<boolean> {
  const base = process.env.SMSKUB_BASE_URL!.replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", key: process.env.SMSKUB_API_KEY! },
      body: JSON.stringify({ to: [phoneLocal], from: process.env.SMSKUB_SENDER, message }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[smskub] network error", e instanceof Error ? e.message : e);
    return false;
  }
  const json = (await res.json().catch(() => null)) as { error?: string; message?: string; data?: { send?: number } } | null;
  // สำเร็จ = 200 และมี data (จำนวนที่ส่ง) ล้มเหลวเช่น 500 "balance is not enough"
  if (!res.ok || !json?.data) {
    console.error("[smskub] send failed", res.status, json?.error ?? json?.message ?? "no body");
    return false;
  }
  return (json.data.send ?? 1) > 0;
}

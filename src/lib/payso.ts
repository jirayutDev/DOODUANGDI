// รับเงินด้วย Payso (Pay Solutions) แบบ PromptPay QR ผ่าน Direct API
// เอกสาร: https://api-docs.payso.co/docs/api/none-ui-api/promptpay-api
// env: PAYSO_MERCHANT_ID (8 หลัก), PAYSO_AUTH_KEY (Bearer สร้าง QR), PAYSO_API_KEY + PAYSO_SECRET_KEY (ตรวจสถานะ)
// Payso มีแค่ production และ postback ไม่มี signature จึงต้องเช็กสถานะกับ Payso ซ้ำก่อนเติม coin เสมอ
import { randomInt } from "node:crypto";
import { fulfillPayment, type FulfillResult } from "@/lib/payments";

const BASE_URL = (process.env.PAYSO_BASE_URL || "https://apis.paysolutions.asia").replace(/\/+$/, "");
const TIMEOUT_MS = 10_000;

export function isPaysoConfigured(): boolean {
  return (
    /^\d{8}$/.test(process.env.PAYSO_MERCHANT_ID ?? "") &&
    !!process.env.PAYSO_AUTH_KEY &&
    !!process.env.PAYSO_API_KEY &&
    !!process.env.PAYSO_SECRET_KEY
  );
}

// referenceNo ของ Payso ต้องเป็นตัวเลข 12 หลักและไม่ซ้ำ (ขึ้นต้นด้วยเลขที่ไม่ใช่ 0 กันเลขหลุดเมื่อถูกอ่านเป็น number)
export function newPaysoRef(): string {
  return String(randomInt(100_000_000_000, 1_000_000_000_000));
}

export function isPaysoRef(v: unknown): v is string {
  return typeof v === "string" && /^[1-9]\d{11}$/.test(v);
}

export type PaysoQr = { orderNo: string; qrDataUrl: string; expiresAt: string | null };

export async function createPromptPayQr(opts: {
  referenceNo: string;
  amountBaht: number;
  customerEmail: string;
  detail: string;
}): Promise<PaysoQr | null> {
  const params = new URLSearchParams({
    merchantID: process.env.PAYSO_MERCHANT_ID!,
    productDetail: opts.detail,
    customerEmail: opts.customerEmail,
    customerName: "customer",
    total: opts.amountBaht.toFixed(2),
    referenceNo: opts.referenceNo,
  });
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/tep/api/v2/promptpaynew?${params}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSO_AUTH_KEY}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[payso] create QR network error", e instanceof Error ? e.message : e);
    return null;
  }
  const json = (await res.json().catch(() => null)) as {
    status?: string;
    message?: string;
    data?: { orderNo?: string | number; referenceNo?: string | number; image?: string; expiredate?: string };
  } | null;
  const d = json?.data;
  if (!res.ok || json?.status !== "success" || !d?.image || String(d.referenceNo) !== opts.referenceNo) {
    console.error("[payso] create QR failed", res.status, json?.message ?? json?.status);
    return null;
  }
  // รับเฉพาะรูป data URI ที่ Payso ส่งมา (กันค่าแปลกปลอมไปโผล่ใน <img src>)
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.image)) return null;
  return { orderNo: String(d.orderNo ?? ""), qrDataUrl: d.image, expiresAt: d.expiredate || null };
}

export type PaysoOrder = { paid: boolean; total: number; referenceNo: string; merchantId: string };

// เช็กสถานะกับ Payso โดยตรง — คืน null ถ้าเรียกไม่ได้ / ไม่มีรายการ (Payso ไม่ตอบอะไรเมื่อยังจ่ายไม่สำเร็จ)
export async function inquireOrder(referenceNo: string): Promise<PaysoOrder | null> {
  const merchantId = process.env.PAYSO_MERCHANT_ID!;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/order/orderdetailpost`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        merchantID: merchantId.slice(-5),
        merchantSecretKey: process.env.PAYSO_SECRET_KEY!,
        apikey: process.env.PAYSO_API_KEY!,
      },
      body: JSON.stringify({ merchantID: merchantId.slice(-5), orderNo: "X", refno: referenceNo, productDetail: "QWERTY" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[payso] inquiry network error", e instanceof Error ? e.message : e);
    throw new Error("payso_unreachable");
  }
  if (!res.ok) return null;
  const text = await res.text();
  if (!text.trim()) return null;
  let j: { ReferenceNo?: string | number; MerchantID?: string | number; Total?: number | string; Status?: string } | null;
  try {
    j = JSON.parse(text);
  } catch {
    return null;
  }
  if (!j) return null;
  return {
    paid: j.Status === "CP",
    total: Number(j.Total),
    referenceNo: String(j.ReferenceNo ?? ""),
    merchantId: String(j.MerchantID ?? ""),
  };
}

type PendingPayment = { id: string; amountBaht: number; promptpayRef: string; status: string };

// ยืนยันรายการกับ Payso แล้วค่อยเติม coin — ใช้ร่วมกันทั้ง postback และตอนโพลสถานะ
// เติมก็ต่อเมื่อ: Payso ตอบว่าสำเร็จ + เลขอ้างอิงตรง + ยอดตรงกับรายการของเรา (+ merchant ตรงถ้า Payso ส่งมา)
export async function settlePaysoPayment(p: PendingPayment): Promise<FulfillResult | "not_paid"> {
  if (p.status !== "pending" && p.status !== "awaiting_confirmation") return "already_confirmed";
  const order = await inquireOrder(p.promptpayRef);
  if (!order || !order.paid) return "not_paid";
  if (order.referenceNo !== p.promptpayRef) return "not_paid";
  if (!Number.isFinite(order.total) || Math.abs(order.total - p.amountBaht) > 0.001) {
    console.error("[payso] amount mismatch", p.id);
    return "not_paid";
  }
  if (order.merchantId && order.merchantId !== process.env.PAYSO_MERCHANT_ID) return "not_paid";
  return fulfillPayment(p.id);
}

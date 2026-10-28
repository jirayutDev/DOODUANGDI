"use client";

export interface CoinApiError {
  error?: string;
  code?: "login_required" | "insufficient_coins";
}

// เรียกเมื่อ API ตอบ 401/402/403 — คืน true ถ้าเป็น error เรื่องสิทธิ์/coin แล้วเปิดกล่องข้อความกลางจอ
// (CoinErrorDialog ใน layout ฟังอีเวนต์นี้ แสดงปุ่มพาไปเข้าสู่ระบบหรือเติม coin)
export const COIN_ERROR_EVENT = "coin:error";

export function handleCoinError(data: CoinApiError | null | undefined): boolean {
  const code = data?.code;
  if (code !== "login_required" && code !== "insufficient_coins") return false;
  window.dispatchEvent(new CustomEvent<CoinApiError>(COIN_ERROR_EVENT, { detail: { code, error: data?.error } }));
  return true;
}

"use client";

import { toast } from "sonner";
import { FEATURE_COSTS, type FeatureKey } from "@/lib/coin-config";

export interface CoinApiError {
  error?: string;
  code?: "login_required" | "membership_required" | "insufficient_coins";
}

const ACTIONS = {
  login_required: { href: "/login", label: "เข้าสู่ระบบ" },
  membership_required: { href: "/membership", label: "สมัครสมาชิก" },
  insufficient_coins: { href: "/coins", label: "เติม coin" },
} as const;

// เรียกเมื่อ API ตอบ 401/402/403 แล้วแสดง toast พร้อมปุ่มพาไปแก้ — คืน true ถ้าเป็น error เรื่องสิทธิ์/coin
export function handleCoinError(data: CoinApiError | null | undefined): boolean {
  const code = data?.code;
  if (!code || !(code in ACTIONS)) return false;
  const a = ACTIONS[code];
  toast.error(data?.error ?? "ใช้บริการนี้ไม่ได้", {
    action: { label: a.label, onClick: () => window.location.assign(a.href) },
  });
  return true;
}

export function featureCostLabel(feature: FeatureKey) {
  return `${FEATURE_COSTS[feature].cost} coin`;
}

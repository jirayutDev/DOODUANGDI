import type { AiPrice } from "@/lib/coin-config";

// คำนวณต้นทุนการเรียก AI (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล) หน่วยเก็บเป็น "ไมโครดอลลาร์" (1,000,000 = 1 USD) เพื่อไม่ให้เศษทศนิยมเพี้ยน

export interface UsageTokens {
  promptTokens: number;
  completionTokens: number;
}

// ราคาของโมเดล: ตรงชื่อก่อน แล้วลองตัด prefix ผู้ให้บริการ (เช่น "anthropic/claude-haiku-4.5" เทียบกับ "claude-haiku-4.5") ไม่เจอ = null
export function findPrice(model: string, prices: AiPrice[]): AiPrice | null {
  const exact = prices.find((p) => p.model === model);
  if (exact) return exact;
  const short = model.includes("/") ? model.slice(model.lastIndexOf("/") + 1) : model;
  return prices.find((p) => p.model === short || p.model.endsWith(`/${short}`)) ?? null;
}

// providerCostUsd = ต้นทุนที่ผู้ให้บริการส่งมาให้ในคำตอบ (ถ้ามี เช่น OpenRouter) ถือว่าแม่นกว่าการคำนวณเอง
export function costMicroUsd(usage: UsageTokens, model: string, prices: AiPrice[], providerCostUsd?: number | null): number | null {
  if (typeof providerCostUsd === "number" && Number.isFinite(providerCostUsd) && providerCostUsd >= 0) {
    return Math.round(providerCostUsd * 1_000_000);
  }
  const price = findPrice(model, prices);
  if (!price) return null;
  // ราคาเป็นดอลลาร์ต่อ 1 ล้านโทเค็น: โทเค็น x ($/1M) = ไมโครดอลลาร์พอดี
  return Math.round(usage.promptTokens * price.inputPerM + usage.completionTokens * price.outputPerM);
}

export function microUsdToBaht(micro: number | null | undefined, usdThb: number): number {
  return ((micro ?? 0) / 1_000_000) * usdThb;
}

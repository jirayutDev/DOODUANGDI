import { getDb } from "@/db";
import { aiUsage } from "@/db/schema";
import { costMicroUsd } from "@/lib/ai-cost";
import { getPricing } from "@/lib/pricing";

// บันทึกการเรียก AI ทุกครั้ง (ฟีเจอร์ โมเดล โทเค็น ต้นทุน) ไว้คิดต้นทุนในหลังบ้าน
// ไม่เก็บข้อความ พรอมต์ รูป หรือคีย์ใดๆ และห้ามทำให้คำขอของผู้ใช้ล้มเด็ดขาด
export interface AiUsageCtx {
  feature: string; // chat | reading-summary | topic-reading | face-reading | love-match | horoscope
  userId?: string | null;
}

export interface AiUsageEntry {
  ctx: AiUsageCtx;
  model: string;
  provider: string; // โฮสต์เท่านั้น เช่น api.maxplus-ai.cc
  ok: boolean;
  promptTokens: number;
  completionTokens: number;
  providerCostUsd?: number | null; // ต้นทุนที่ผู้ให้บริการส่งมาให้ (ถ้ามี)
  ms: number;
  error?: string | null; // สาเหตุที่ล้มเหลว (สั้น ไม่มีคีย์/ข้อมูลผู้ใช้)
}

const MAX_INT = 2_000_000_000;
const clampInt = (n: number) => Math.max(0, Math.min(MAX_INT, Math.round(Number.isFinite(n) ? n : 0)));

export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  try {
    const promptTokens = clampInt(entry.promptTokens);
    const completionTokens = clampInt(entry.completionTokens);
    let cost: number | null = null;
    if (promptTokens + completionTokens === 0 && entry.providerCostUsd == null) {
      cost = 0; // ไม่ได้ใช้โทเค็น (เช่น error ก่อนได้คำตอบ) ไม่ต้องรอรู้ราคาโมเดล
    } else {
      const { aiPrices } = await getPricing();
      cost = costMicroUsd({ promptTokens, completionTokens }, entry.model, aiPrices, entry.providerCostUsd);
      if (cost !== null) cost = clampInt(cost);
    }
    await getDb()
      .insert(aiUsage)
      .values({
        feature: entry.ctx.feature,
        userId: entry.ctx.userId ?? null,
        model: entry.model.slice(0, 120),
        provider: entry.provider.slice(0, 120),
        ok: entry.ok,
        promptTokens,
        completionTokens,
        costMicroUsd: cost,
        ms: clampInt(entry.ms),
        error: entry.ok ? null : (entry.error ?? "ไม่ทราบสาเหตุ").slice(0, 300),
      });
  } catch (e) {
    console.error("[ai-usage] log failed:", e instanceof Error ? e.name : "unknown");
  }
}

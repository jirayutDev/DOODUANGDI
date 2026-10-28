import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import { DEFAULT_PRICING, FEATURE_COSTS, type FeatureKey, type Pricing } from "@/lib/coin-config";

// ราคาที่ใช้งานจริง: แอดมินตั้งในตาราง app_settings (key "pricing") ไม่มี/ผิดรูปแบบ = ใช้ค่าเริ่มต้นใน coin-config
// ค่าต่ำสุดของแพ็กเกจ 6 บาท เพราะ Payso สร้าง QR ต่ำกว่านี้ไม่ได้

const costField = z.number().int().min(1).max(1000);
const costsShape = Object.fromEntries(Object.keys(FEATURE_COSTS).map((k) => [k, costField])) as Record<FeatureKey, typeof costField>;

export const pricingSchema = z.object({
  costs: z.object(costsShape),
  packages: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,20}$/),
        coins: z.number().int().min(1).max(1_000_000),
        priceBaht: z.number().int().min(6).max(100_000),
        badge: z.string().trim().max(20).optional(),
      })
    )
    .min(1)
    .max(12)
    .refine((list) => new Set(list.map((p) => p.id)).size === list.length, "id แพ็กเกจซ้ำกัน"),
  welcomeCoins: z.number().int().min(0).max(1000),
});

const TTL_MS = 30_000;
let cache: { at: number; value: Pricing } | null = null;

export function invalidatePricingCache() {
  cache = null;
}

export async function getPricing(): Promise<Pricing> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const [row] = await getDb().select().from(appSettings).where(eq(appSettings.key, "pricing")).limit(1);
    let value = DEFAULT_PRICING;
    if (row) {
      const raw = (row.value ?? {}) as Partial<Pricing>;
      const parsed = pricingSchema.safeParse({
        costs: { ...DEFAULT_PRICING.costs, ...(raw.costs ?? {}) },
        packages: raw.packages ?? DEFAULT_PRICING.packages,
        welcomeCoins: raw.welcomeCoins ?? DEFAULT_PRICING.welcomeCoins,
      });
      if (parsed.success) value = parsed.data as Pricing;
    }
    cache = { at: Date.now(), value };
    return value;
  } catch {
    // อ่านฐานข้อมูลไม่ได้: ใช้ค่าที่เคยอ่านได้ล่าสุด ไม่งั้นค่าเริ่มต้น (ไม่แคชความล้มเหลว)
    return cache?.value ?? DEFAULT_PRICING;
  }
}

export async function savePricing(p: Pricing) {
  await getDb()
    .insert(appSettings)
    .values({ key: "pricing", value: p })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: p, updatedAt: new Date() } });
  invalidatePricingCache();
}

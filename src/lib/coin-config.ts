// ราคา coin ต่อบริการ และแพ็กเกจเติม coin — ไฟล์นี้เป็นค่าเริ่มต้น/ชื่อบริการ
// ราคาจริงที่ใช้งานแอดมินแก้ได้ที่หน้าแอดมิน (เก็บในตาราง app_settings) ดู src/lib/pricing.ts
// ฟรีไม่ต้องล็อกอิน: ดวงรายวัน (/daily-horoscope), ดวงรายสัปดาห์ (weekly), ดวงรายเดือน (monthly)

export const FEATURE_COSTS = {
  chat: { label: "ถามน้องมู 1 ข้อ", cost: 3 },
  "reading-summary": { label: "สรุปผลเปิดไพ่", cost: 10 },
  "topic-reading": { label: "ดูดวงเฉพาะเรื่อง", cost: 8 },
  "face-reading": { label: "โหงวเฮ้ง", cost: 15 },
  "love-match": { label: "จับคู่ความรัก", cost: 10 },
  "sian-si": { label: "เซียมซี", cost: 2 },
  dice: { label: "ลูกเต๋าพยากรณ์", cost: 2 },
  numerology: { label: "เลขศาสตร์", cost: 3 },
  personality: { label: "นิสัยตามราศี", cost: 3 },
} as const;

export type FeatureKey = keyof typeof FEATURE_COSTS;

export function isFeatureKey(v: unknown): v is FeatureKey {
  return typeof v === "string" && v in FEATURE_COSTS;
}

export interface CoinPackage {
  id: string;
  coins: number;
  priceBaht: number;
  badge?: string;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "c30", coins: 30, priceBaht: 29 },
  { id: "c65", coins: 65, priceBaht: 59 },
  { id: "c115", coins: 115, priceBaht: 99, badge: "คุ้ม" },
  { id: "c240", coins: 240, priceBaht: 199 },
  { id: "c650", coins: 650, priceBaht: 499, badge: "คุ้มสุด" },
];

export function getCoinPackage(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id);
}

// coin ต้อนรับผู้ใช้ใหม่ (ให้ครั้งเดียวต่อบัญชี)
export const WELCOME_COINS = 10;

export const KIND_LABEL: Record<string, string> = {
  topup: "เติม coin",
  code: "แลกโค้ด",
  bonus: "โบนัส",
  spend: "ใช้บริการ",
  refund: "คืน coin",
  admin: "แอดมินปรับ coin",
};

// ข้อความของแต่ละรายการใน ledger: spend = ชื่อฟีเจอร์, refund = "คืน coin: ชื่อฟีเจอร์"
export function describeTransaction(item: { kind: string; ref: string | null }): string {
  const feature = item.ref && isFeatureKey(item.ref) ? FEATURE_COSTS[item.ref].label : null;
  if (item.kind === "refund") return feature ? `คืน coin: ${feature}` : KIND_LABEL.refund;
  if (item.kind === "bonus" && item.ref === "welcome") return "coin ต้อนรับ";
  if (item.kind === "bonus" && item.ref?.startsWith("promo:")) return "โบนัสโปรโมชันเติม coin";
  return feature ?? KIND_LABEL[item.kind] ?? item.kind;
}

// โปรโมชันการเติม coin: ได้ coin โบนัสเพิ่มเมื่อเติมแพ็กเกจที่เข้าเงื่อนไขในช่วงเวลาที่กำหนด
export interface Promotion {
  id: string;
  name: string;
  bonusPercent: number; // โบนัส % ของ coin ในแพ็กเกจ (0 = ไม่ใช้)
  bonusCoins: number; // โบนัสคงที่ (coin) บวกเพิ่ม (0 = ไม่ใช้)
  packageIds: string[]; // ว่าง = ใช้กับทุกแพ็กเกจ
  startsAt?: string; // ISO มีโซนเวลา ไม่ใส่ = เริ่มทันที
  endsAt?: string; // ISO มีโซนเวลา ไม่ใส่ = ไม่หมดอายุ
  active: boolean;
}

// ราคาโมเดล AI (ดอลลาร์ต่อ 1 ล้านโทเค็น) ใช้คำนวณต้นทุนต่อครั้งเมื่อผู้ให้บริการไม่ส่งราคามาให้
export interface AiPrice {
  model: string; // ชื่อโมเดลตามที่ใช้เรียก เช่น claude-haiku-4-5-20251001
  inputPerM: number;
  outputPerM: number;
}

// ราคาที่ใช้งานจริง (ค่าเริ่มต้น = ค่าด้านบน ถูกแทนที่ด้วยที่แอดมินตั้ง)
export interface Pricing {
  costs: Record<FeatureKey, number>;
  packages: CoinPackage[];
  welcomeCoins: number;
  promotions: Promotion[];
  morDuCommissionPercent: number; // ส่วนที่เว็บเก็บจาก coin ของคิวหมอดู (%)
  coinBahtRate: number; // อัตราแปลง coin รายได้หมอดูเป็นบาทตอนโอน (บาทต่อ 1 coin)
  aiPrices: AiPrice[]; // ราคาโมเดล AI ไว้คิดต้นทุน
  usdThb: number; // อัตราแลกดอลลาร์เป็นบาท
}

export const DEFAULT_PRICING: Pricing = {
  costs: Object.fromEntries(Object.entries(FEATURE_COSTS).map(([k, v]) => [k, v.cost])) as Record<FeatureKey, number>,
  packages: COIN_PACKAGES,
  welcomeCoins: WELCOME_COINS,
  promotions: [],
  morDuCommissionPercent: 20,
  coinBahtRate: 0.7,
  aiPrices: [],
  usdThb: 36,
};

export function isPromoLive(p: Promotion, now = Date.now()): boolean {
  if (!p.active) return false;
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return false;
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return false;
  return true;
}

// โบนัสของแพ็กเกจหนึ่งจากโปรที่ใช้งานอยู่ — ใช้โปรที่ให้โบนัสมากที่สุดเพียงอันเดียว (ไม่ซ้อนกัน)
export function bonusFor(pack: CoinPackage, promos: Promotion[], now = Date.now()): { bonus: number; promo: Promotion | null } {
  let best = { bonus: 0, promo: null as Promotion | null };
  for (const p of promos) {
    if (!isPromoLive(p, now)) continue;
    if (p.packageIds.length > 0 && !p.packageIds.includes(pack.id)) continue;
    const bonus = Math.floor((pack.coins * p.bonusPercent) / 100) + p.bonusCoins;
    if (bonus > best.bonus) best = { bonus, promo: p };
  }
  return best;
}

// ราคา coin ต่อบริการ และแพ็กเกจเติม coin — แก้ราคาที่ไฟล์นี้ไฟล์เดียว
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
};

// ข้อความของแต่ละรายการใน ledger: spend = ชื่อฟีเจอร์, refund = "คืน coin: ชื่อฟีเจอร์"
export function describeTransaction(item: { kind: string; ref: string | null }): string {
  const feature = item.ref && isFeatureKey(item.ref) ? FEATURE_COSTS[item.ref].label : null;
  if (item.kind === "refund") return feature ? `คืน coin: ${feature}` : KIND_LABEL.refund;
  if (item.kind === "bonus" && item.ref === "welcome") return "coin ต้อนรับ";
  return feature ?? KIND_LABEL[item.kind] ?? item.kind;
}

// แพ็กเกจสมาชิก — ราคาตามช่วงที่ระบุไว้ในแผนธุรกิจ (AI Plus 59–79 บาท, Mu Club ~149 บาท ต่อเดือน)
export interface MembershipPlan {
  key: "ai_plus" | "mu_club";
  name: string;
  priceBaht: number;
  perks: string[];
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    key: "ai_plus",
    name: "AI Plus",
    priceBaht: 69,
    perks: ["แชทกับน้องมูไม่จำกัดข้อ", "ดวงรายเดือนแบบเจาะลึก", "ดูดวงคู่"],
  },
  {
    key: "mu_club",
    name: "Mu Club",
    priceBaht: 149,
    perks: [
      "สิทธิ์ AI Plus ทั้งหมด",
      "Coin โบนัสสมทบทุกเดือน",
      "ส่วนลดถามหมอดูแบบเป็นข้อ",
    ],
  },
];

export function getMembershipPlan(key: string): MembershipPlan | undefined {
  return MEMBERSHIP_PLANS.find((p) => p.key === key);
}

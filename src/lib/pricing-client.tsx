"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PRICING, type FeatureKey, type Pricing } from "@/lib/coin-config";

// ราคาฝั่งหน้าเว็บ: เริ่มจากค่าเริ่มต้น (กัน hydration ไม่ตรง) แล้วดึงราคาจริงจาก /api/pricing ครั้งเดียวต่อการโหลดหน้า
let current: Pricing = DEFAULT_PRICING;
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started) return;
  started = true;
  fetch("/api/pricing")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: Pick<Pricing, "costs" | "packages" | "promotions"> | null) => {
      if (!d?.costs || !Array.isArray(d.packages)) return;
      current = { ...DEFAULT_PRICING, costs: d.costs, packages: d.packages, promotions: d.promotions ?? [] };
      listeners.forEach((l) => l());
    })
    .catch(() => {
      started = false;
    });
}

function subscribe(l: () => void) {
  listeners.add(l);
  start();
  return () => {
    listeners.delete(l);
  };
}

export function usePricing(): Pricing {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_PRICING);
}

// แสดงค่า coin ของบริการ เช่น <Cost feature="chat" /> -> 3, <Cost feature="chat" unit /> -> 3 coin
export function Cost({ feature, unit }: { feature: FeatureKey; unit?: boolean }) {
  const cost = usePricing().costs[feature];
  return <>{unit ? `${cost} coin` : cost}</>;
}

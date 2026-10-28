"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FEATURE_COSTS, type FeatureKey, type Pricing } from "@/lib/coin-config";

const field = "h-11 w-full rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";

interface PackageRow {
  id: string;
  coins: string;
  priceBaht: string;
  badge: string;
}

export function PricingForm({ initial }: { initial: Pricing }) {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageRow[]>(
    initial.packages.map((p) => ({ id: p.id, coins: String(p.coins), priceBaht: String(p.priceBaht), badge: p.badge ?? "" }))
  );
  const [costs, setCosts] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial.costs).map(([k, v]) => [k, String(v)]))
  );
  const [welcome, setWelcome] = useState(String(initial.welcomeCoins));
  const [busy, setBusy] = useState(false);

  function updatePackage(i: number, patch: Partial<PackageRow>) {
    setPackages((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        costs: Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, Number(v)])),
        packages: packages.map((p) => ({
          id: p.id.trim(),
          coins: Number(p.coins),
          priceBaht: Number(p.priceBaht),
          badge: p.badge.trim() || undefined,
        })),
        welcomeCoins: Number(welcome),
      };
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success("บันทึกราคาแล้ว (ผู้ใช้เห็นภายใน 30 วินาที)");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold">แพ็กเกจเติม coin</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          ราคาขั้นต่ำ 6 บาท (ข้อจำกัดของ Payso) · รหัสแพ็กเกจใช้ a-z 0-9 - ห้ามซ้ำ · ป้ายเช่น &quot;คุ้ม&quot; ไม่ใส่ก็ได้ · รายการที่ลูกค้าสร้างไปแล้วยังใช้ราคาเดิม
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {packages.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <input value={p.id} onChange={(e) => updatePackage(i, { id: e.target.value })} aria-label="รหัสแพ็กเกจ" placeholder="รหัส เช่น c30" className={field} />
              <input value={p.coins} onChange={(e) => updatePackage(i, { coins: e.target.value })} inputMode="numeric" aria-label="จำนวน coin" placeholder="coin" className={field} />
              <input value={p.priceBaht} onChange={(e) => updatePackage(i, { priceBaht: e.target.value })} inputMode="numeric" aria-label="ราคา (บาท)" placeholder="บาท" className={field} />
              <input value={p.badge} onChange={(e) => updatePackage(i, { badge: e.target.value })} maxLength={20} aria-label="ป้าย" placeholder="ป้าย (ไม่บังคับ)" className={field} />
              <Button type="button" variant="ghost" disabled={packages.length <= 1} onClick={() => setPackages((l) => l.filter((_, idx) => idx !== i))} className="h-11">
                ลบ
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={packages.length >= 12}
          onClick={() => setPackages((l) => [...l, { id: "", coins: "", priceBaht: "", badge: "" }])}
          className="mt-3"
        >
          + เพิ่มแพ็กเกจ
        </Button>
      </section>

      <section>
        <h2 className="text-xl font-bold">ราคาแต่ละบริการ (coin)</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(Object.keys(FEATURE_COSTS) as FeatureKey[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line-soft px-4 py-2 text-sm">
              <span>{FEATURE_COSTS[k].label}</span>
              <input
                value={costs[k] ?? ""}
                onChange={(e) => setCosts((c) => ({ ...c, [k]: e.target.value }))}
                inputMode="numeric"
                aria-label={FEATURE_COSTS[k].label}
                className="h-10 w-24 rounded-lg bg-cream px-3 text-right text-base text-ink outline-none"
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">coin ต้อนรับผู้ใช้ใหม่</h2>
        <p className="mt-1 text-xs text-muted-foreground">ให้ครั้งเดียวตอนสร้างกระเป๋าครั้งแรก ใส่ 0 = ไม่แจก</p>
        <input value={welcome} onChange={(e) => setWelcome(e.target.value)} inputMode="numeric" aria-label="coin ต้อนรับ" className={`${field} mt-3 max-w-[160px]`} />
      </section>

      <div>
        <Button type="submit" disabled={busy} className="h-11 rounded-xl px-8 font-semibold">
          {busy ? "กำลังบันทึก..." : "บันทึกราคา"}
        </Button>
      </div>
    </form>
  );
}

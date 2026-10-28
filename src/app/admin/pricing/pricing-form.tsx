"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bonusFor, FEATURE_COSTS, isPromoLive, type FeatureKey, type Pricing, type Promotion } from "@/lib/coin-config";
import { coinsToBaht, splitPrice, thaiLocalToDate } from "@/lib/booking";

const field = "h-11 w-full rounded-xl bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";
const smallField = "h-10 w-full rounded-lg bg-cream px-3 text-base text-ink outline-none placeholder:text-ink/40";

interface PackageRow {
  id: string;
  coins: string;
  priceBaht: string;
  badge: string;
}

interface PromoRow {
  id: string;
  name: string;
  bonusPercent: string;
  bonusCoins: string;
  packageIds: string[];
  startsAt: string; // datetime-local (เวลาไทย) ว่าง = เริ่มทันที
  endsAt: string; // datetime-local (เวลาไทย) ว่าง = ไม่หมดอายุ
  active: boolean;
}

// ISO -> ค่าสำหรับ <input type="datetime-local"> เป็นเวลาไทย (UTC+7)
function isoToThaiLocal(iso: string | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t + 7 * 3_600_000).toISOString().slice(0, 16);
}

function rowToPromotion(r: PromoRow): Promotion {
  const startsAt = r.startsAt ? thaiLocalToDate(r.startsAt) : null;
  const endsAt = r.endsAt ? thaiLocalToDate(r.endsAt) : null;
  return {
    id: r.id.trim(),
    name: r.name.trim(),
    bonusPercent: Number(r.bonusPercent) || 0,
    bonusCoins: Number(r.bonusCoins) || 0,
    packageIds: r.packageIds,
    startsAt: startsAt && Number.isFinite(startsAt.getTime()) ? startsAt.toISOString() : undefined,
    endsAt: endsAt && Number.isFinite(endsAt.getTime()) ? endsAt.toISOString() : undefined,
    active: r.active,
  };
}

// สถานะของโปรเทียบกับเวลาปัจจุบัน (อ่านเวลาในฟังก์ชันนอก component ตามกฎ purity ของ React)
function promoState(p: Promotion): { label: string; tone: string } {
  const now = Date.now();
  if (!p.active) return { label: "ปิดอยู่", tone: "border-border bg-white/5 text-soft-text" };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: "ยังไม่เริ่ม", tone: "border-amber-500/40 bg-amber-500/15 text-amber-300" };
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: "หมดอายุ", tone: "border-red-500/40 bg-red-500/15 text-red-300" };
  return isPromoLive(p, now)
    ? { label: "ใช้งานอยู่", tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" }
    : { label: "ปิดอยู่", tone: "border-border bg-white/5 text-soft-text" };
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
  const [commission, setCommission] = useState(String(initial.morDuCommissionPercent));
  const [rate, setRate] = useState(String(initial.coinBahtRate));
  const [promos, setPromos] = useState<PromoRow[]>(
    initial.promotions.map((p) => ({
      id: p.id,
      name: p.name,
      bonusPercent: String(p.bonusPercent),
      bonusCoins: String(p.bonusCoins),
      packageIds: p.packageIds,
      startsAt: isoToThaiLocal(p.startsAt),
      endsAt: isoToThaiLocal(p.endsAt),
      active: p.active,
    }))
  );
  const [busy, setBusy] = useState(false);

  function updatePackage(i: number, patch: Partial<PackageRow>) {
    setPackages((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function updatePromo(i: number, patch: Partial<PromoRow>) {
    setPromos((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function togglePromoPackage(i: number, packageId: string) {
    setPromos((list) =>
      list.map((p, idx) =>
        idx === i ? { ...p, packageIds: p.packageIds.includes(packageId) ? p.packageIds.filter((x) => x !== packageId) : [...p.packageIds, packageId] } : p
      )
    );
  }

  const packageIds = packages.map((p) => p.id.trim()).filter(Boolean);
  const validPackages = packages
    .map((p) => ({ id: p.id.trim(), coins: Number(p.coins), priceBaht: Number(p.priceBaht) }))
    .filter((p) => p.id && Number.isFinite(p.coins) && p.coins > 0);

  // ตัวอย่างการแบ่ง coin ของคิวหมอดู 100 coin
  const pct = Number(commission);
  const rateNum = Number(rate);
  const example = Number.isFinite(pct) && pct >= 0 && pct <= 90 ? splitPrice(100, pct) : null;
  const exampleBaht = example && Number.isFinite(rateNum) && rateNum > 0 ? coinsToBaht(example.morDuCoins, rateNum) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // id โปรที่เว้นว่างสร้างให้เองเป็น promo-1, promo-2 ... ไม่ซ้ำกับที่มีอยู่
      const used = new Set(promos.map((p) => p.id.trim()).filter(Boolean));
      let counter = 1;
      const promotions = promos.map((p) => {
        let id = p.id.trim();
        if (!id) {
          while (used.has(`promo-${counter}`)) counter++;
          id = `promo-${counter}`;
          used.add(id);
        }
        return { ...rowToPromotion({ ...p, id }), packageIds: p.packageIds.filter((x) => packageIds.includes(x)) };
      });
      for (const [i, row] of promos.entries()) {
        if (row.startsAt && !promotions[i].startsAt) throw new Error(`โปร "${row.name || i + 1}": วันเริ่มไม่ถูกต้อง`);
        if (row.endsAt && !promotions[i].endsAt) throw new Error(`โปร "${row.name || i + 1}": วันสิ้นสุดไม่ถูกต้อง`);
      }

      const body: Pricing = {
        costs: Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, Number(v)])) as Pricing["costs"],
        packages: packages.map((p) => ({
          id: p.id.trim(),
          coins: Number(p.coins),
          priceBaht: Number(p.priceBaht),
          badge: p.badge.trim() || undefined,
        })),
        welcomeCoins: Number(welcome),
        promotions,
        morDuCommissionPercent: Number(commission),
        coinBahtRate: Number(rate),
      };
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success("บันทึกแล้ว (ผู้ใช้เห็นภายใน 30 วินาที)");
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
        <h2 className="text-xl font-bold">โปรโมชันการเติม</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          ได้ coin โบนัสเพิ่มเมื่อเติมแพ็กเกจที่เข้าเงื่อนไขในช่วงเวลาที่กำหนด (เวลาไทย) · ไม่ติ๊กแพ็กเกจเลย = ใช้กับทุกแพ็กเกจ · ถ้ามีหลายโปรที่เข้าเงื่อนไข ใช้โปรที่ให้โบนัสมากที่สุดเพียงอันเดียว (ไม่ซ้อนกัน) · รายการเติมที่สร้างไปแล้วยึดโบนัสตอนสร้าง
        </p>
        <div className="mt-3 flex flex-col gap-4">
          {promos.map((p, i) => {
            const promo = rowToPromotion(p);
            const state = promoState(promo);
            // ตัวอย่างโบนัสต่อแพ็กเกจ (สมมติว่าโปรเปิดและอยู่ในช่วงเวลา เพื่อให้เห็นผลแม้โปรยังไม่เริ่ม)
            const previewPromo: Promotion = { ...promo, active: true, startsAt: undefined, endsAt: undefined };
            return (
              <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line-soft p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={p.active} onChange={(e) => updatePromo(i, { active: e.target.checked })} className="size-4 accent-[#E8B84A]" />
                      เปิดใช้งาน
                    </label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPromos((l) => l.filter((_, idx) => idx !== i))}>
                      ลบโปร
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    ชื่อโปร
                    <input value={p.name} onChange={(e) => updatePromo(i, { name: e.target.value })} maxLength={40} placeholder="เช่น โปรสิ้นเดือน" className={smallField} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    โบนัส (%)
                    <input value={p.bonusPercent} onChange={(e) => updatePromo(i, { bonusPercent: e.target.value })} inputMode="numeric" placeholder="0" className={smallField} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    โบนัสเพิ่ม (coin)
                    <input value={p.bonusCoins} onChange={(e) => updatePromo(i, { bonusCoins: e.target.value })} inputMode="numeric" placeholder="0" className={smallField} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    รหัสโปร (ไม่ใส่ = สร้างให้)
                    <input value={p.id} onChange={(e) => updatePromo(i, { id: e.target.value })} maxLength={20} placeholder="promo-1" className={smallField} />
                  </label>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    เริ่ม (เวลาไทย ว่าง = เริ่มทันที)
                    <input type="datetime-local" value={p.startsAt} onChange={(e) => updatePromo(i, { startsAt: e.target.value })} className={smallField} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    สิ้นสุด (เวลาไทย ว่าง = ไม่หมดอายุ)
                    <input type="datetime-local" value={p.endsAt} onChange={(e) => updatePromo(i, { endsAt: e.target.value })} className={smallField} />
                  </label>
                </div>

                <fieldset>
                  <legend className="text-xs text-muted-foreground">ใช้กับแพ็กเกจ (ไม่ติ๊ก = ทุกแพ็กเกจ)</legend>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {packageIds.map((id) => (
                      <label key={id} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={p.packageIds.includes(id)} onChange={() => togglePromoPackage(i, id)} className="size-4 accent-[#E8B84A]" />
                        {id}
                      </label>
                    ))}
                    {packageIds.length === 0 && <span className="text-xs text-muted-foreground">ยังไม่มีแพ็กเกจที่ตั้งรหัสไว้</span>}
                  </div>
                </fieldset>

                <p className="text-xs text-soft-text">
                  ตัวอย่างโบนัส:{" "}
                  {validPackages
                    .map((pack) => {
                      const { bonus } = bonusFor({ id: pack.id, coins: pack.coins, priceBaht: pack.priceBaht }, [previewPromo]);
                      return bonus > 0 ? `${pack.id} (${pack.coins} coin) → +${bonus}` : null;
                    })
                    .filter(Boolean)
                    .join(" · ") || "ไม่มีแพ็กเกจที่เข้าเงื่อนไข หรือยังไม่ได้ตั้งโบนัส"}
                </p>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={promos.length >= 10}
          onClick={() => setPromos((l) => [...l, { id: "", name: "", bonusPercent: "10", bonusCoins: "0", packageIds: [], startsAt: "", endsAt: "", active: true }])}
          className="mt-3"
        >
          + เพิ่มโปรโมชัน
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

      <section>
        <h2 className="text-xl font-bold">ค่าบริการและอัตราแลก (คิวหมอดู)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          คิวปรึกษาหมอดูจ่ายด้วย coin: เว็บเก็บค่าบริการเป็นเปอร์เซ็นต์ของ coin ที่ลูกค้าจ่าย ที่เหลือเป็นรายได้ coin ของหมอดู ตอนโอนเงินจริงให้หมอดูแปลง coin เป็นบาทตามอัตราด้านล่าง
          (ควรตั้งต่ำกว่าราคาขายต่อ coin ของแพ็กเกจที่ถูกที่สุด เพื่อไม่ให้เว็บขาดทุน) · มีผลกับคิวที่ขอหลังบันทึก
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-soft-text">
            ค่าบริการเว็บ (% ของ coin ที่ลูกค้าจ่าย)
            <input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-soft-text">
            อัตราแปลงตอนโอนให้หมอดู (บาทต่อ 1 coin)
            <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className={field} />
          </label>
        </div>
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-soft-text">
          {example
            ? `ตัวอย่าง: ลูกค้าจ่าย 100 coin → เว็บเก็บ ${example.commissionCoins} coin, หมอดูได้ ${example.morDuCoins} coin${exampleBaht !== null ? ` ≈ ฿${exampleBaht.toLocaleString("th-TH")} ตอนโอน` : ""}`
            : "ใส่ค่าบริการเป็นเปอร์เซ็นต์ 0–90 เพื่อดูตัวอย่าง"}
        </p>
      </section>

      <div>
        <Button type="submit" disabled={busy} className="h-11 rounded-xl px-8 font-semibold">
          {busy ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}
        </Button>
      </div>
    </form>
  );
}

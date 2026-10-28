"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmModal } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { bonusFor, FEATURE_COSTS, isPromoLive, type FeatureKey, type Pricing, type Promotion } from "@/lib/coin-config";
import { coinsToBaht, splitPrice, thaiLocalToDate } from "@/lib/booking";
import { costMicroUsd, microUsdToBaht } from "@/lib/ai-cost";

const input =
  "h-10 w-full rounded-lg border border-border bg-[#1a1636] px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary";
const num = `${input} text-right`;

interface PackageRow {
  id: string;
  coins: string;
  priceBaht: string;
  badge: string;
}
interface AiPriceRow {
  model: string;
  inputPerM: string;
  outputPerM: string;
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
interface FormState {
  packages: PackageRow[];
  promos: PromoRow[];
  costs: Record<string, string>;
  welcome: string;
  commission: string;
  rate: string;
  usdThb: string;
  aiRows: AiPriceRow[];
}

// ISO -> ค่าสำหรับ <input type="datetime-local"> เป็นเวลาไทย (UTC+7)
function isoToThaiLocal(iso: string | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t + 7 * 3_600_000).toISOString().slice(0, 16);
}

function toForm(p: Pricing): FormState {
  return {
    packages: p.packages.map((x) => ({ id: x.id, coins: String(x.coins), priceBaht: String(x.priceBaht), badge: x.badge ?? "" })),
    promos: p.promotions.map((x) => ({
      id: x.id,
      name: x.name,
      bonusPercent: String(x.bonusPercent),
      bonusCoins: String(x.bonusCoins),
      packageIds: x.packageIds,
      startsAt: isoToThaiLocal(x.startsAt),
      endsAt: isoToThaiLocal(x.endsAt),
      active: x.active,
    })),
    costs: Object.fromEntries(Object.entries(p.costs).map(([k, v]) => [k, String(v)])),
    welcome: String(p.welcomeCoins),
    commission: String(p.morDuCommissionPercent),
    rate: String(p.coinBahtRate),
    usdThb: String(p.usdThb),
    aiRows: p.aiPrices.map((x) => ({ model: x.model, inputPerM: String(x.inputPerM), outputPerM: String(x.outputPerM) })),
  };
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

const SECTIONS = [
  { id: "packages", label: "แพ็กเกจเติม coin" },
  { id: "promos", label: "โปรโมชัน" },
  { id: "costs", label: "ราคาบริการ" },
  { id: "welcome", label: "coin ต้อนรับ" },
  { id: "mordu", label: "คิวหมอดู" },
  { id: "ai", label: "ต้นทุน AI" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

// ---------- ชิ้นส่วนเล็ก ----------

function Section({ id, title, desc, children }: { id: SectionId; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-20 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground", className)}>
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-normal text-red-300">{error}</span> : hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

// ช่องตัวเลขพร้อมหน่วยท้ายช่อง
function Unit({ unit, value, onChange, placeholder, decimal, label }: { unit: string; value: string; onChange: (v: string) => void; placeholder?: string; decimal?: boolean; label?: string }) {
  return (
    <span className="relative block">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={decimal ? "decimal" : "numeric"}
        placeholder={placeholder}
        aria-label={label}
        className={cn(num, "pr-[3.25rem]")}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-normal text-muted-foreground">{unit}</span>
    </span>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm"
    >
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-primary" : "bg-white/20")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[1.375rem]" : "left-0.5")} />
      </span>
      {checked ? "เปิดอยู่" : "ปิดอยู่"}
    </button>
  );
}

function IconDelete({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-soft-text hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-dashed border-primary/60 px-4 text-sm font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Plus className="size-4" />
      {children}
    </button>
  );
}

const baht = (n: number, max = 2) => n.toLocaleString("th-TH", { maximumFractionDigits: max });
const PKG_GRID = "md:grid-cols-[1fr_1fr_1fr_6rem_1fr_2.5rem]";

export function PricingForm({ initial }: { initial: Pricing }) {
  const router = useRouter();
  const [base, setBase] = useState<FormState>(() => toForm(initial));
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const { packages, promos, costs, welcome, commission, rate, usdThb, aiRows } = form;

  const updatePackage = (i: number, patch: Partial<PackageRow>) => set({ packages: packages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const updatePromo = (i: number, patch: Partial<PromoRow>) => set({ promos: promos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const updateAiRow = (i: number, patch: Partial<AiPriceRow>) => set({ aiRows: aiRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const togglePromoPackage = (i: number, id: string) =>
    updatePromo(i, { packageIds: promos[i].packageIds.includes(id) ? promos[i].packageIds.filter((x) => x !== id) : [...promos[i].packageIds, id] });

  // ---------- สิ่งที่เปลี่ยนไปจากค่าที่บันทึกไว้ (นับเป็นส่วน) ----------
  const changed = useMemo(() => {
    const diff = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
    const list: SectionId[] = [];
    if (diff(form.packages, base.packages)) list.push("packages");
    if (diff(form.promos, base.promos)) list.push("promos");
    if (diff(form.costs, base.costs)) list.push("costs");
    if (form.welcome !== base.welcome) list.push("welcome");
    if (form.commission !== base.commission || form.rate !== base.rate) list.push("mordu");
    if (form.usdThb !== base.usdThb || diff(form.aiRows, base.aiRows)) list.push("ai");
    return list;
  }, [form, base]);
  const dirty = changed.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---------- ตรวจความถูกต้อง ----------
  const errors = useMemo(() => {
    const pk: Record<number, { id?: string; coins?: string; price?: string }> = {};
    const seen = new Map<string, number>();
    packages.forEach((p, i) => {
      const e: { id?: string; coins?: string; price?: string } = {};
      const id = p.id.trim();
      if (!id) e.id = "ใส่รหัสแพ็กเกจ";
      else if (!/^[a-z0-9-]+$/.test(id)) e.id = "ใช้ a-z 0-9 - เท่านั้น";
      else if (seen.has(id)) e.id = "รหัสซ้ำกับแถวอื่น";
      seen.set(id, i);
      if (!(Number(p.coins) > 0)) e.coins = "ต้องมากกว่า 0";
      if (!(Number(p.priceBaht) > 0)) e.price = "ต้องมากกว่า 0";
      if (e.id || e.coins || e.price) pk[i] = e;
    });
    const pr: Record<number, { name?: string; bonus?: string; time?: string }> = {};
    promos.forEach((p, i) => {
      const e: { name?: string; bonus?: string; time?: string } = {};
      if (!p.name.trim()) e.name = "ตั้งชื่อโปร";
      const pc = Number(p.bonusPercent || 0);
      const cc = Number(p.bonusCoins || 0);
      if (!Number.isFinite(pc) || !Number.isFinite(cc) || pc < 0 || cc < 0) e.bonus = "โบนัสต้องไม่ติดลบ";
      if (p.startsAt && p.endsAt && p.endsAt <= p.startsAt) e.time = "เวลาสิ้นสุดต้องหลังเวลาเริ่ม";
      if (e.name || e.bonus || e.time) pr[i] = e;
    });
    const co: Record<string, string> = {};
    for (const k of Object.keys(FEATURE_COSTS)) {
      const v = Number(costs[k]);
      if (costs[k] === undefined || costs[k] === "" || !Number.isFinite(v) || v < 0) co[k] = "ใส่ตัวเลข ≥ 0";
    }
    const other: { welcome?: string; commission?: string; rate?: string; usdThb?: string } = {};
    if (welcome === "" || !(Number(welcome) >= 0)) other.welcome = "ใส่ตัวเลข ≥ 0";
    if (commission === "" || !(Number(commission) >= 0 && Number(commission) <= 90)) other.commission = "ต้องอยู่ระหว่าง 0–90";
    if (!(Number(rate) > 0)) other.rate = "ต้องมากกว่า 0";
    if (!(Number(usdThb) > 0)) other.usdThb = "ต้องมากกว่า 0";
    const count = Object.keys(pk).length + Object.keys(pr).length + Object.keys(co).length + Object.keys(other).length;
    return { pk, pr, co, other, count };
  }, [packages, promos, costs, welcome, commission, rate, usdThb]);

  const packageIds = packages.map((p) => p.id.trim()).filter(Boolean);
  const validPackages = packages
    .map((p) => ({ id: p.id.trim(), coins: Number(p.coins), priceBaht: Number(p.priceBaht) }))
    .filter((p) => p.id && Number.isFinite(p.coins) && p.coins > 0);
  const priced = validPackages.filter((p) => p.priceBaht > 0);
  const totalCoins = priced.reduce((a, p) => a + p.coins, 0);
  const avgBahtPerCoin = totalCoins > 0 ? priced.reduce((a, p) => a + p.priceBaht, 0) / totalCoins : 0;
  const maxBpc = Math.max(0, ...priced.map((p) => p.priceBaht / p.coins));

  // ตัวอย่างการแบ่ง coin ของคิวหมอดู 100 coin
  const pct = Number(commission);
  const rateNum = Number(rate);
  const example = commission !== "" && Number.isFinite(pct) && pct >= 0 && pct <= 90 ? splitPrice(100, pct) : null;
  const exampleBaht = example && Number.isFinite(rateNum) && rateNum > 0 ? coinsToBaht(example.morDuCoins, rateNum) : null;

  // ตัวอย่างต้นทุนจากแถวแรก: 1,200 โทเค็นเข้า + 600 โทเค็นออก
  const firstAi = aiRows[0];
  const usdThbNum = Number(usdThb);
  let aiExample: string | null = null;
  if (firstAi && firstAi.model.trim() && Number.isFinite(usdThbNum) && usdThbNum > 0) {
    const inP = Number(firstAi.inputPerM);
    const outP = Number(firstAi.outputPerM);
    if (Number.isFinite(inP) && Number.isFinite(outP) && inP >= 0 && outP >= 0) {
      const micro = costMicroUsd({ promptTokens: 1200, completionTokens: 600 }, firstAi.model.trim(), [{ model: firstAi.model.trim(), inputPerM: inP, outputPerM: outP }]);
      const b = microUsdToBaht(micro, usdThbNum);
      aiExample = `1,200 โทเค็นเข้า + 600 โทเค็นออก (${firstAi.model.trim()}) ≈ ฿${b.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    }
  }

  function addExamplePromo() {
    set({
      promos: [...promos, { id: "", name: "โบนัส 10% ทุกแพ็กเกจ", bonusPercent: "10", bonusCoins: "0", packageIds: [], startsAt: "", endsAt: "", active: true }],
    });
  }

  async function removePackage(i: number) {
    const label = packages[i].id.trim() || `แถวที่ ${i + 1}`;
    const { confirmed } = await confirmModal({ title: "ลบแพ็กเกจ", message: `ลบแพ็กเกจ "${label}" ออกจากรายการ? (จะมีผลเมื่อกดบันทึก)`, confirmLabel: "ลบ", tone: "danger" });
    if (confirmed) set({ packages: packages.filter((_, idx) => idx !== i) });
  }
  async function removePromo(i: number) {
    const label = promos[i].name.trim() || `โปรที่ ${i + 1}`;
    const { confirmed } = await confirmModal({ title: "ลบโปรโมชัน", message: `ลบโปร "${label}"? (จะมีผลเมื่อกดบันทึก)`, confirmLabel: "ลบ", tone: "danger" });
    if (confirmed) set({ promos: promos.filter((_, idx) => idx !== i) });
  }
  async function resetAll() {
    const { confirmed } = await confirmModal({ title: "ยกเลิกการแก้ไข", message: "ค่าที่แก้ไว้ทั้งหมดจะกลับไปเป็นค่าที่บันทึกล่าสุด", confirmLabel: "ยกเลิกการแก้ไข", cancelLabel: "กลับไปแก้ต่อ", tone: "danger" });
    if (confirmed) setForm(base);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (errors.count > 0 || !dirty) return;
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
        // แถวที่ไม่ได้ใส่ชื่อโมเดลถือว่าว่าง ไม่ส่ง
        aiPrices: aiRows
          .filter((r) => r.model.trim())
          .map((r) => ({ model: r.model.trim(), inputPerM: Number(r.inputPerM) || 0, outputPerM: Number(r.outputPerM) || 0 })),
        usdThb: Number(usdThb),
      };
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setBase(form); // ค่าที่บันทึกแล้วกลายเป็นฐานเปรียบเทียบใหม่
      toast.success("บันทึกแล้ว (ผู้ใช้เห็นภายใน 30 วินาที)");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const sectionLabel = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.label ?? id;

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      {/* เมนูข้ามไปแต่ละส่วน */}
      <nav aria-label="ข้ามไปยังส่วน" className="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur admin-scroll">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#sec-${s.id}`}
            className="relative inline-flex min-h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm text-soft-text hover:border-primary"
          >
            {s.label}
            {changed.includes(s.id) && <span className="ml-2 size-2 rounded-full bg-primary" aria-label="มีการแก้ไข" />}
          </a>
        ))}
      </nav>

      {/* แพ็กเกจ */}
      <Section id="packages" title="แพ็กเกจเติม coin" desc="รายการที่ลูกค้าเลือกซื้อในหน้าเติม coin">
        <div className={cn("mb-1 hidden gap-3 px-3 text-xs font-semibold text-muted-foreground md:grid", PKG_GRID)}>
          <span>รหัส</span>
          <span className="text-right">จำนวน coin</span>
          <span className="text-right">ราคา (บาท)</span>
          <span className="text-right">บาท/coin</span>
          <span>ป้าย (ไม่บังคับ)</span>
          <span />
        </div>
        <div className="flex flex-col gap-3">
          {packages.map((p, i) => {
            const e = errors.pk[i] ?? {};
            const coins = Number(p.coins);
            const price = Number(p.priceBaht);
            const bpc = coins > 0 && price > 0 ? price / coins : 0;
            const cheaper = bpc > 0 && maxBpc > 0 ? Math.round((1 - bpc / maxBpc) * 100) : 0;
            const low = price > 0 && price < 6;
            return (
              <div key={i} className="rounded-xl border border-border bg-white/[0.03] p-3">
                <div className={cn("grid grid-cols-2 gap-3 md:items-start", PKG_GRID)}>
                  <Field label="รหัสแพ็กเกจ" error={e.id} className="md:[&>:first-child]:sr-only">
                    <input value={p.id} onChange={(ev) => updatePackage(i, { id: ev.target.value })} placeholder="เช่น c30" maxLength={20} className={input} />
                  </Field>
                  <Field label="จำนวน coin" error={e.coins} className="md:[&>:first-child]:sr-only">
                    <Unit unit="coin" value={p.coins} onChange={(v) => updatePackage(i, { coins: v })} placeholder="30" />
                  </Field>
                  <Field label="ราคา (บาท)" error={e.price} className="md:[&>:first-child]:sr-only">
                    <Unit unit="บาท" value={p.priceBaht} onChange={(v) => updatePackage(i, { priceBaht: v })} placeholder="29" />
                  </Field>
                  <div className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    <span className="md:sr-only">บาทต่อ coin</span>
                    <span className="flex h-10 items-center justify-end text-sm font-normal text-soft-text">{bpc > 0 ? `฿${baht(bpc)}` : "–"}</span>
                  </div>
                  <Field label="ป้าย (ไม่บังคับ)" className="md:[&>:first-child]:sr-only">
                    <input value={p.badge} onChange={(ev) => updatePackage(i, { badge: ev.target.value })} maxLength={20} placeholder="เช่น คุ้ม" className={input} />
                  </Field>
                  <div className="col-span-2 flex justify-end md:col-span-1 md:block">
                    <IconDelete label={`ลบแพ็กเกจ ${p.id || i + 1}`} disabled={packages.length <= 1} onClick={() => removePackage(i)} />
                  </div>
                </div>
                {(cheaper > 0 || low) && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {cheaper > 0 && <span className="text-emerald-300">ถูกกว่าแพ็กเล็กสุด {cheaper}%</span>}
                    {low && (
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <AlertTriangle className="size-3.5" />
                        ราคาต่ำกว่า 6 บาท Payso จะไม่รับชำระ
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <AddButton disabled={packages.length >= 12} onClick={() => set({ packages: [...packages, { id: "", coins: "", priceBaht: "", badge: "" }] })}>
          เพิ่มแพ็กเกจ
        </AddButton>
        <p className="mt-3 text-xs text-muted-foreground">ราคาขั้นต่ำ 6 บาท (ข้อจำกัดของ Payso) · สูงสุด 12 แพ็กเกจ · รายการที่ลูกค้าสร้างไปแล้วยังใช้ราคาเดิม</p>
      </Section>

      {/* โปรโมชัน */}
      <Section id="promos" title="โปรโมชันการเติม" desc="แจก coin โบนัสเมื่อลูกค้าเติมในช่วงเวลาที่กำหนด">
        {promos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <Sparkles className="size-7 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold">ยังไม่มีโปรโมชัน</p>
              <p className="mt-1 text-sm text-muted-foreground">โปรโมชันช่วยให้ลูกค้าเติมมากขึ้น เช่น &quot;โบนัส 10% ทุกแพ็กเกจ&quot; หรือ &quot;เติมแพ็กเกจ c115 แถมอีก 20 coin เฉพาะสุดสัปดาห์&quot;</p>
            </div>
            <Button type="button" onClick={addExamplePromo} className="h-10 rounded-lg px-5 font-semibold">
              สร้างโปรตัวอย่าง
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {promos.map((p, i) => {
              const e = errors.pr[i] ?? {};
              const promo = rowToPromotion(p);
              const state = promoState(promo);
              // ตัวอย่างโบนัสต่อแพ็กเกจ (สมมติว่าโปรเปิดและอยู่ในช่วงเวลา เพื่อให้เห็นผลแม้โปรยังไม่เริ่ม)
              const previewPromo: Promotion = { ...promo, active: true, startsAt: undefined, endsAt: undefined };
              const preview = validPackages
                .map((pack) => {
                  const { bonus } = bonusFor({ id: pack.id, coins: pack.coins, priceBaht: pack.priceBaht }, [previewPromo]);
                  return bonus > 0 ? `${pack.id} (${pack.coins}) → +${bonus}` : null;
                })
                .filter(Boolean);
              return (
                <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-white/[0.03] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold", state.tone)}>{state.label}</span>
                      <Switch checked={p.active} onChange={(v) => updatePromo(i, { active: v })} label={`เปิดใช้งานโปร ${p.name || i + 1}`} />
                    </div>
                    <IconDelete label={`ลบโปร ${p.name || i + 1}`} onClick={() => removePromo(i)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
                    <Field label="ชื่อโปร" error={e.name} className="sm:col-span-2 lg:col-span-1">
                      <input value={p.name} onChange={(ev) => updatePromo(i, { name: ev.target.value })} maxLength={40} placeholder="เช่น โปรสิ้นเดือน" className={input} />
                    </Field>
                    <Field label="โบนัส" error={e.bonus} hint="% ของ coin ในแพ็กเกจ">
                      <Unit unit="%" value={p.bonusPercent} onChange={(v) => updatePromo(i, { bonusPercent: v })} placeholder="0" />
                    </Field>
                    <Field label="โบนัสเพิ่ม" hint="coin คงที่ บวกเพิ่ม">
                      <Unit unit="coin" value={p.bonusCoins} onChange={(v) => updatePromo(i, { bonusCoins: v })} placeholder="0" />
                    </Field>
                  </div>

                  <fieldset>
                    <legend className="text-xs font-semibold text-muted-foreground">ใช้กับแพ็กเกจ (ไม่เลือก = ทุกแพ็กเกจ)</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {packageIds.map((id) => {
                        const on = p.packageIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => togglePromoPackage(i, id)}
                            className={cn(
                              "inline-flex min-h-10 items-center rounded-full border px-4 text-sm",
                              on ? "border-primary bg-primary/20 font-semibold text-primary" : "border-border text-soft-text hover:border-primary"
                            )}
                          >
                            {on ? "✓ " : ""}
                            {id}
                          </button>
                        );
                      })}
                      {packageIds.length === 0 && <span className="text-xs text-muted-foreground">ยังไม่มีแพ็กเกจที่ตั้งรหัสไว้</span>}
                    </div>
                    {p.packageIds.length === 0 && packageIds.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">ตอนนี้ใช้กับทุกแพ็กเกจ</p>}
                  </fieldset>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="เริ่ม (เวลาไทย)" hint="ว่าง = เริ่มทันที">
                      <input type="datetime-local" value={p.startsAt} onChange={(ev) => updatePromo(i, { startsAt: ev.target.value })} className={input} />
                    </Field>
                    <Field label="สิ้นสุด (เวลาไทย)" error={e.time} hint="ว่าง = ไม่หมดอายุ">
                      <input type="datetime-local" value={p.endsAt} onChange={(ev) => updatePromo(i, { endsAt: ev.target.value })} className={input} />
                    </Field>
                  </div>

                  <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-soft-text">
                    ตัวอย่างโบนัส: {preview.length > 0 ? preview.join(" · ") : "ไม่มีแพ็กเกจที่เข้าเงื่อนไข หรือยังไม่ได้ตั้งโบนัส"}
                  </p>
                  <Field label="รหัสโปร (ไม่ใส่ = สร้างให้เอง)" className="max-w-[12rem]">
                    <input value={p.id} onChange={(ev) => updatePromo(i, { id: ev.target.value })} maxLength={20} placeholder="promo-1" className={input} />
                  </Field>
                </div>
              );
            })}
          </div>
        )}
        {promos.length > 0 && (
          <AddButton disabled={promos.length >= 10} onClick={() => set({ promos: [...promos, { id: "", name: "", bonusPercent: "10", bonusCoins: "0", packageIds: [], startsAt: "", endsAt: "", active: true }] })}>
            เพิ่มโปรโมชัน
          </AddButton>
        )}
        <p className="mt-3 text-xs text-muted-foreground">หลายโปรเข้าเงื่อนไขพร้อมกัน ใช้อันที่โบนัสมากสุดเพียงอันเดียว (ไม่ซ้อน) · รายการเติมที่สร้างไปแล้วยึดโบนัสตอนสร้าง</p>
      </Section>

      {/* ราคาบริการ */}
      <Section id="costs" title="ราคาแต่ละบริการ" desc="coin ที่หักต่อการใช้งาน 1 ครั้ง">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {(Object.keys(FEATURE_COSTS) as FeatureKey[]).map((k) => {
            const v = Number(costs[k]);
            return (
              <li key={k} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm">{FEATURE_COSTS[k].label}</p>
                  {costs[k] && v >= 0 && avgBahtPerCoin > 0 ? <p className="text-xs text-muted-foreground">≈ ฿{baht(v * avgBahtPerCoin)} ต่อครั้ง</p> : errors.co[k] ? <p className="text-xs text-red-300">{errors.co[k]}</p> : null}
                </div>
                <div className="w-32 shrink-0">
                  <Unit unit="coin" value={costs[k] ?? ""} onChange={(val) => set({ costs: { ...costs, [k]: val } })} label={FEATURE_COSTS[k].label} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          {avgBahtPerCoin > 0 ? `ราคาโดยประมาณคิดจากราคาเฉลี่ยของแพ็กเกจ ฿${baht(avgBahtPerCoin)} ต่อ coin` : "ใส่แพ็กเกจให้ครบเพื่อดูราคาโดยประมาณเป็นบาท"}
        </p>
      </Section>

      {/* coin ต้อนรับ */}
      <Section id="welcome" title="coin ต้อนรับผู้ใช้ใหม่" desc="ให้ครั้งเดียวตอนสร้างกระเป๋าครั้งแรก ใส่ 0 = ไม่แจก">
        <Field label="จำนวน coin ที่แจก" error={errors.other.welcome} className="max-w-[12rem]">
          <Unit unit="coin" value={welcome} onChange={(v) => set({ welcome: v })} />
        </Field>
      </Section>

      {/* คิวหมอดู */}
      <Section id="mordu" title="ค่าบริการและอัตราแลก (คิวหมอดู)" desc="คิวปรึกษาหมอดูจ่ายด้วย coin เว็บหักค่าบริการเป็น % ส่วนที่เหลือเป็นรายได้ของหมอดู">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ค่าบริการเว็บ" error={errors.other.commission} hint="% ของ coin ที่ลูกค้าจ่าย (0–90)">
            <Unit unit="%" decimal value={commission} onChange={(v) => set({ commission: v })} />
          </Field>
          <Field label="อัตราแปลงตอนโอนให้หมอดู" error={errors.other.rate} hint="บาทต่อ 1 coin">
            <Unit unit="฿/coin" decimal value={rate} onChange={(v) => set({ rate: v })} />
          </Field>
        </div>
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-soft-text">
          {example
            ? `ตัวอย่าง: ลูกค้าจ่าย 100 coin → เว็บเก็บ ${example.commissionCoins} coin, หมอดูได้ ${example.morDuCoins} coin${exampleBaht !== null ? ` ≈ ฿${exampleBaht.toLocaleString("th-TH")} ตอนโอน` : ""}`
            : "ใส่ค่าบริการเป็นเปอร์เซ็นต์ 0–90 เพื่อดูตัวอย่าง"}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          ควรตั้งอัตราแปลงต่ำกว่าราคาขายต่อ coin ของแพ็กเกจที่ถูกที่สุด{priced.length > 0 ? ` (ตอนนี้ต่ำสุด ฿${baht(Math.min(...priced.map((p) => p.priceBaht / p.coins)))} ต่อ coin)` : ""} เพื่อไม่ให้เว็บขาดทุน · มีผลกับคิวที่ขอหลังบันทึก
        </p>
      </Section>

      {/* ต้นทุน AI */}
      <Section id="ai" title="ต้นทุน AI" desc="ใช้คำนวณต้นทุนต่อครั้งในรายงาน “ต้นทุน AI” จากจำนวนโทเค็นที่ใช้จริง">
        <Field label="อัตราแลกดอลลาร์" error={errors.other.usdThb} className="max-w-[14rem]">
          <Unit unit="฿/$" decimal value={usdThb} onChange={(v) => set({ usdThb: v })} />
        </Field>

        <h3 className="mt-5 text-sm font-bold">ราคาโมเดล (ดอลลาร์ต่อ 1 ล้านโทเค็น)</h3>
        <div className="mt-2">
          {aiRows.length > 0 && (
            <div className="mb-1 hidden grid-cols-[2fr_1fr_1fr_2.5rem] gap-3 px-3 text-xs font-semibold text-muted-foreground md:grid">
              <span>ชื่อโมเดล</span>
              <span className="text-right">ขาเข้า</span>
              <span className="text-right">ขาออก</span>
              <span />
            </div>
          )}
          <div className="flex flex-col gap-3">
            {aiRows.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-white/[0.03] p-3 md:grid-cols-[2fr_1fr_1fr_2.5rem] md:items-start">
                <Field label="ชื่อโมเดล" className="col-span-2 md:col-span-1 md:[&>:first-child]:sr-only">
                  <input value={r.model} onChange={(ev) => updateAiRow(i, { model: ev.target.value })} maxLength={80} placeholder="เช่น claude-haiku-4-5-20251001" className={input} />
                </Field>
                <Field label="ขาเข้า" className="md:[&>:first-child]:sr-only">
                  <Unit unit="$/ล้าน" decimal value={r.inputPerM} onChange={(v) => updateAiRow(i, { inputPerM: v })} placeholder="0" />
                </Field>
                <Field label="ขาออก" className="md:[&>:first-child]:sr-only">
                  <Unit unit="$/ล้าน" decimal value={r.outputPerM} onChange={(v) => updateAiRow(i, { outputPerM: v })} placeholder="0" />
                </Field>
                <div className="col-span-2 flex justify-end md:col-span-1 md:block">
                  <IconDelete label={`ลบโมเดล ${r.model || i + 1}`} onClick={() => set({ aiRows: aiRows.filter((_, idx) => idx !== i) })} />
                </div>
              </div>
            ))}
            {aiRows.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">ยังไม่ได้ตั้งราคาโมเดล รายงานจะแสดงเฉพาะจำนวนโทเค็น</p>}
          </div>
        </div>
        <AddButton disabled={aiRows.length >= 40} onClick={() => set({ aiRows: [...aiRows, { model: "", inputPerM: "", outputPerM: "" }] })}>
          เพิ่มโมเดล
        </AddButton>
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-soft-text">
          {aiExample ? `ตัวอย่าง: ${aiExample}` : "ใส่ชื่อโมเดล ราคาขาเข้า/ขาออก และอัตราแลกในแถวแรก เพื่อดูตัวอย่างต้นทุนต่อครั้ง"}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          ดูราคาจากตารางของผู้ให้บริการ (MaxPlus พูล Claude Native: claude-haiku-4-5-20251001 เข้า 5.80 / ออก 30.00 ต้องแก้ให้ตรงพูลที่ใช้) · ชื่อโมเดลต้องตรงกับ AI_MODEL / AI_FALLBACK_MODELS เป๊ะ ·
          โมเดลที่ไม่ได้ตั้งราคาจะแสดง “ไม่ทราบราคา” (ถ้าผู้ให้บริการส่งต้นทุนมาในคำตอบ จะใช้ค่านั้นก่อน)
        </p>
      </Section>

      {/* แถบบันทึกติดขอบล่าง */}
      <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-[#1a1636]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 basis-56 text-sm" role="status" aria-live="polite">
            {errors.count > 0 ? (
              <span className="inline-flex items-start gap-1.5 text-red-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                บันทึกไม่ได้: ยังมี {errors.count} จุดที่ต้องแก้ (ดูข้อความสีแดง)
              </span>
            ) : dirty ? (
              <span className="text-amber-300">
                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก · {changed.length} ส่วน
                <span className="hidden text-muted-foreground sm:inline"> ({changed.map(sectionLabel).join(", ")})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">ยังไม่มีการเปลี่ยนแปลง</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" disabled={!dirty || busy} onClick={resetAll} className="h-11 rounded-xl px-4">
              ยกเลิกการแก้ไข
            </Button>
            <Button type="submit" disabled={!dirty || busy || errors.count > 0} className="h-11 rounded-xl px-6 font-semibold">
              {busy ? "กำลังบันทึก..." : "บันทึกราคา"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

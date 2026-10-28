"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loginHref } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";
import { FEATURE_COSTS, describeTransaction, isFeatureKey } from "@/lib/coin-config";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  amount: number;
  kind: string;
  ref: string | null;
  createdAt: string;
  baht: number | null;
}

interface Summary {
  balance: number;
  topupCoins: number;
  topupBaht: number;
  bonusCoins: number;
  spentCoins: number;
  refundedCoins: number;
  byFeature: { ref: string | null; uses: number; coins: number }[];
}

interface ActivityResponse {
  items: Item[];
  hasMore: boolean;
  summary?: Summary;
  code?: string;
}

const RANGES = [
  { value: "30d", label: "30 วันล่าสุด" },
  { value: "all", label: "ทั้งหมด" },
] as const;

const KINDS = [
  { value: "", label: "ทั้งหมด" },
  { value: "spend", label: "ใช้บริการ" },
  { value: "topup", label: "เติม coin" },
  { value: "bonus", label: "โบนัส/โค้ด" },
  { value: "refund", label: "คืน coin" },
] as const;

const pillGroup = "inline-flex flex-wrap gap-1.5 rounded-[14px] bg-card p-1";
const pill = (active: boolean) =>
  cn(
    "min-h-10 rounded-[10px] px-3.5 text-sm transition-colors",
    active ? "bg-cream font-bold text-ink" : "font-medium text-muted-foreground hover:text-foreground"
  );

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function ActivityPanel({ view }: { view: "summary" | "history" }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30d");
  const [kind, setKind] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "loggedOut" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (offset: number) => {
      const qs = new URLSearchParams({ range, offset: String(offset) });
      if (view === "summary") {
        qs.set("summary", "1");
      } else if (kind) {
        qs.set("kind", kind);
      }
      const res = await fetch(`/api/me/activity?${qs}`);
      if (res.status === 401) {
        setState("loggedOut");
        return null;
      }
      if (!res.ok) {
        setState("error");
        return null;
      }
      return (await res.json()) as ActivityResponse;
    },
    [range, kind, view]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const data = await load(0);
      if (cancelled || !data) return;
      setItems(data.items);
      setHasMore(data.hasMore);
      setSummary(data.summary ?? null);
      setState("ready");
    };
    void run();
    const onChange = () => void run();
    window.addEventListener("coins:changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("coins:changed", onChange);
    };
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    const data = await load(items.length);
    if (data) {
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }

  if (state === "loggedOut") {
    return (
      <div className="rounded-[18px] bg-card p-6 text-center">
        <p className="text-soft-text">เข้าสู่ระบบเพื่อดูการใช้ coin และกิจกรรมของคุณ</p>
        <Button asChild className="mt-4 h-auto min-h-[46px] rounded-[14px] px-6 font-bold">
          <Link href={loginHref("/profile")}>เข้าสู่ระบบ</Link>
        </Button>
      </div>
    );
  }
  if (state === "error") {
    return <p className="rounded-[18px] bg-card p-6 text-center text-soft-text">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้งนะ</p>;
  }

  if (view === "summary") {
    return (
      <div className="flex flex-col gap-5">
        <div role="group" aria-label="ช่วงเวลา" className={cn(pillGroup, "self-start")}>
          {RANGES.map((r) => (
            <button key={r.value} type="button" aria-pressed={range === r.value} onClick={() => setRange(r.value)} className={pill(range === r.value)}>
              {r.label}
            </button>
          ))}
        </div>

        {state === "loading" || !summary ? (
          <p className="text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="coin คงเหลือ" value={summary.balance} highlight />
              <Stat
                label="เติมแล้ว"
                value={summary.topupCoins}
                sub={summary.topupBaht > 0 ? `${summary.topupBaht.toLocaleString("th-TH")} บาท` : undefined}
              />
              <Stat label="ใช้ไป" value={summary.spentCoins} sub={summary.refundedCoins > 0 ? `คืนแล้ว ${summary.refundedCoins}` : undefined} />
              <Stat label="โบนัส/โค้ด" value={summary.bonusCoins} />
            </div>

            <section className="rounded-[18px] bg-card p-5">
              <h2 className="text-xl font-bold">ใช้ coin ไปกับอะไร</h2>
              {summary.byFeature.length === 0 ? (
                <p className="mt-3 text-soft-text">ยังไม่มีการใช้ coin ในช่วงนี้</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3.5">
                  {summary.byFeature.map((f) => {
                    const max = summary.byFeature[0].coins || 1;
                    const label = f.ref && isFeatureKey(f.ref) ? FEATURE_COSTS[f.ref].label : (f.ref ?? "อื่นๆ");
                    return (
                      <li key={f.ref}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span>{label}</span>
                          <span className="text-soft-text">
                            {f.uses} ครั้ง · <span className="font-semibold text-foreground">{f.coins} coin</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (f.coins / max) * 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="ประเภทรายการ" className={cn(pillGroup, "self-start")}>
        {KINDS.map((k) => (
          <button key={k.value} type="button" aria-pressed={kind === k.value} onClick={() => setKind(k.value)} className={pill(kind === k.value)}>
            {k.label}
          </button>
        ))}
      </div>

      {state === "loading" ? (
        <p className="text-muted-foreground">กำลังโหลด...</p>
      ) : items.length === 0 ? (
        <p className="rounded-[18px] bg-card p-6 text-center text-soft-text">ยังไม่มีรายการ</p>
      ) : (
        <ul>
          {items.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 border-b border-border py-3 text-sm">
              <span className="min-w-0">
                <span className="block">{describeTransaction(h)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(h.createdAt)}
                  {h.baht ? ` · ${h.baht.toLocaleString("th-TH")} บาท` : ""}
                </span>
              </span>
              <span className={cn("shrink-0 font-semibold", h.amount > 0 ? "text-primary" : "text-soft-text")}>
                {h.amount > 0 ? `+${h.amount}` : h.amount}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button type="button" variant="outline" disabled={loadingMore} onClick={loadMore} className="h-auto min-h-[46px] self-center rounded-[14px] px-6">
          {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่ม"}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        ระบบเก็บเฉพาะประวัติการใช้ coin ส่วนคำตอบของน้องมูดูย้อนหลังได้ที่{" "}
        <Link href="/mu-book" className="font-semibold text-primary">
          สมุดดวง
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-[18px] bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[32px] font-bold leading-none", highlight && "text-primary")}>{value.toLocaleString("th-TH")}</p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

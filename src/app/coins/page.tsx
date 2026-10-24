"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SlipUpload } from "@/components/slip-upload";
import { COIN_PACKAGES, FEATURE_COSTS } from "@/lib/coin-config";

interface BalanceInfo {
  loggedIn: boolean;
  balance: number;
  member: boolean;
}

interface Checkout {
  paymentId: string;
  ref: string;
  qrDataUrl: string;
  amount: number;
  coins: number;
}

interface HistoryItem {
  id: string;
  amount: number;
  kind: string;
  ref: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  topup: "เติม coin",
  code: "แลกโค้ด",
  bonus: "โบนัสสมาชิก",
  spend: "ใช้บริการ",
  refund: "คืน coin",
};

function describe(item: HistoryItem) {
  const feature = item.ref && item.ref in FEATURE_COSTS ? FEATURE_COSTS[item.ref as keyof typeof FEATURE_COSTS].label : null;
  return feature ?? KIND_LABEL[item.kind] ?? item.kind;
}

export default function CoinsPage() {
  const [info, setInfo] = useState<BalanceInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/coins/balance");
    const data = (await res.json()) as BalanceInfo;
    setInfo(data);
    window.dispatchEvent(new Event("coins:changed"));
    if (data.loggedIn) {
      const h = await fetch("/api/coins/history");
      if (h.ok) setHistory(((await h.json()) as { items: HistoryItem[] }).items);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleBuy(packageId: string) {
    setLoadingPack(packageId);
    try {
      const res = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheckout(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้าง QR ไม่สำเร็จ");
    } finally {
      setLoadingPack(null);
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/coins/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`ได้รับ ${data.coins} coin แล้ว`);
      setCode("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "แลกโค้ดไม่สำเร็จ");
    } finally {
      setRedeeming(false);
    }
  }

  const loggedOut = info && !info.loggedIn;

  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">กระเป๋า coin</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">เติม coin ใช้บริการ</h1>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-card p-5">
        <div>
          <p className="text-sm text-muted-foreground">coin ของคุณ</p>
          <p className="text-[44px] font-bold leading-none text-primary">{info ? info.balance : "–"}</p>
        </div>
        {loggedOut ? (
          <Button asChild className="h-auto min-h-[46px] rounded-[14px] px-6 font-bold">
            <Link href="/login">เข้าสู่ระบบเพื่อเติม coin</Link>
          </Button>
        ) : info && !info.member ? (
          <div className="text-sm text-soft-text">
            ยังไม่ได้เป็นสมาชิก ต้องสมัครสมาชิกก่อนถึงจะใช้ coin ได้{" "}
            <Link href="/membership" className="font-semibold text-primary">
              สมัครสมาชิก ›
            </Link>
          </div>
        ) : null}
      </section>

      {checkout ? (
        <section className="mt-9 flex flex-wrap items-center gap-x-12 gap-y-8">
          <div className="relative h-[220px] w-[220px] shrink-0 overflow-hidden bg-white p-2">
            <Image src={checkout.qrDataUrl} alt="PromptPay QR" fill className="object-contain" />
          </div>
          <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-3.5">
            <h2 className="text-[26px] font-bold leading-[1.5]">
              เติม {checkout.coins} coin — {checkout.amount} บาท
            </h2>
            <p className="text-soft-text">
              สแกนจ่ายด้วย PromptPay ผ่านแอปธนาคาร โอนแล้วอัปโหลดสลิป ระบบตรวจให้อัตโนมัติ · เลขอ้างอิง{" "}
              <span className="font-mono text-foreground">{checkout.ref}</span>
            </p>
            <SlipUpload
              paymentId={checkout.paymentId}
              onVerified={() => {
                setCheckout(null);
                refresh();
              }}
              onManualNotified={() => setCheckout(null)}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => setCheckout(null)} className="h-auto min-h-[50px] rounded-[14px] px-5">
                ยกเลิก
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-9">
          <h2 className="text-xl font-bold">เลือกแพ็กเกจ</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            {COIN_PACKAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!!loggedOut || loadingPack === p.id}
                onClick={() => handleBuy(p.id)}
                className="relative flex min-h-[132px] flex-col items-start justify-between rounded-[14px] border border-line-soft bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
              >
                {p.badge && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {p.badge}
                  </span>
                )}
                <span className="text-3xl font-bold leading-none text-primary">{p.coins}</span>
                <span className="text-xs text-muted-foreground">coin</span>
                <span className="font-semibold">{loadingPack === p.id ? "กำลังสร้าง QR..." : `${p.priceBaht} บาท`}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <form onSubmit={handleRedeem} className="rounded-[18px] border border-line-soft p-5">
          <h2 className="text-xl font-bold">มีโค้ดแลก coin?</h2>
          <p className="mt-1 text-sm text-muted-foreground">กรอกโค้ดเพื่อรับ coin ฟรี ใช้ได้คนละครั้งต่อโค้ด</p>
          <div className="mt-3 flex gap-2 rounded-2xl bg-cream p-1.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={32}
              aria-label="โค้ดแลก coin"
              placeholder="เช่น WELCOME50"
              disabled={!!loggedOut}
              className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-base text-ink outline-none placeholder:text-ink/40"
            />
            <Button type="submit" disabled={redeeming || !!loggedOut || !code.trim()} className="h-11 rounded-xl px-5 font-semibold">
              {redeeming ? "กำลังแลก..." : "แลกโค้ด"}
            </Button>
          </div>
        </form>

        <div className="rounded-[18px] border border-line-soft p-5">
          <h2 className="text-xl font-bold">ใช้ coin ได้กับอะไรบ้าง</h2>
          <ul className="mt-2">
            <li className="flex justify-between border-b border-border py-2 text-sm">
              <span>ดวงรายวัน · รายสัปดาห์ · รายเดือน</span>
              <span className="font-semibold text-primary">ฟรี</span>
            </li>
            {Object.values(FEATURE_COSTS).map((f) => (
              <li key={f.label} className="flex justify-between border-b border-border py-2 text-sm">
                <span>{f.label}</span>
                <span className="text-soft-text">{f.cost} coin</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">ประวัติล่าสุด</h2>
          <ul className="mt-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between border-b border-border py-2.5 text-sm">
                <span>
                  {describe(h)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </span>
                <span className={h.amount > 0 ? "font-semibold text-primary" : "text-soft-text"}>
                  {h.amount > 0 ? `+${h.amount}` : h.amount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        ระบบยืนยันการชำระเงินเป็นแบบแจ้งแล้วให้แอดมินตรวจสอบ coin จะเข้ากระเป๋าหลังแอดมินยืนยัน
      </p>
    </div>
  );
}

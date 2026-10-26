"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { loginHref } from "@/lib/safe-next";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SlipUpload } from "@/components/slip-upload";
import { CoinIcon } from "@/components/coin-icon";
import { COIN_PACKAGES, FEATURE_COSTS, describeTransaction } from "@/lib/coin-config";

interface BalanceInfo {
  loggedIn: boolean;
  balance: number;
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
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">เติม coin ใช้บริการ</h1>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-card p-5">
        <div className="flex items-center gap-4">
          <CoinIcon count={1} className="h-16 w-16 shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]" />
          <div>
            <p className="text-sm text-muted-foreground">coin ของคุณ</p>
            <p className="text-[44px] font-bold leading-none text-primary">{info ? info.balance : "–"}</p>
          </div>
        </div>
        {loggedOut ? (
          <Button asChild className="h-auto min-h-[46px] rounded-[14px] px-6 font-bold">
            <Link href={loginHref("/coins")}>เข้าสู่ระบบเพื่อเติม coin</Link>
          </Button>
        ) : null}
      </section>

      {checkout ? (
        <section className="mt-9 flex flex-wrap items-center gap-x-12 gap-y-8">
          <div className="relative h-[220px] w-[220px] shrink-0 overflow-hidden bg-white p-2">
            <Image src={checkout.qrDataUrl} alt="PromptPay QR" fill className="object-contain" />
          </div>
          <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-3.5">
            <h2 className="text-[26px] font-bold leading-[1.9]">
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
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-5 md:gap-x-4">
            {COIN_PACKAGES.map((p, i) => {
              const best = !!p.badge;
              const busy = loadingPack === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!!loggedOut || busy}
                  onClick={() => handleBuy(p.id)}
                  className={cn(
                    "group relative flex flex-col items-center rounded-[22px] border bg-card px-3 pb-4 pt-6 text-center transition-all hover:-translate-y-1 hover:border-primary disabled:opacity-85 disabled:hover:translate-y-0",
                    best
                      ? "border-2 border-transparent shadow-[0_12px_32px_rgba(232,184,74,0.28)] [background:linear-gradient(160deg,#54419a_0%,#31275f_50%,#1f1a40_100%)_padding-box,linear-gradient(135deg,#fff1b8_0%,#e8b84a_45%,#8a5a10_100%)_border-box]"
                      : "border-line-soft bg-gradient-to-b from-[#2d2457] to-[#1d1840]",
                    i === COIN_PACKAGES.length - 1 && "col-span-2 md:col-span-1"
                  )}
                >
                  {p.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#fff1b8] via-[#f2c14e] to-[#c98f26] px-3.5 py-0.5 text-xs font-bold text-ink shadow-md">
                      {p.badge}
                    </span>
                  )}
                  <CoinIcon
                    count={p.coins < 50 ? 1 : p.coins < 100 ? 2 : p.coins < 200 ? 3 : p.coins < 500 ? 5 : 7}
                    className="h-[92px] w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105"
                  />
                  <span className="mt-3 flex items-baseline gap-1.5">
                    <span className="bg-gradient-to-b from-[#fff3c4] via-[#f5c542] to-[#d38f1c] bg-clip-text text-[38px] font-bold leading-none text-transparent">
                      {p.coins}
                    </span>
                    <span className="text-sm text-muted-foreground">coin</span>
                  </span>
                  <span
                    className={cn(
                      "mt-3.5 w-full rounded-full px-3 py-1.5 text-base font-bold",
                      best
                        ? "bg-gradient-to-r from-[#fff1b8] via-[#f2c14e] to-[#c98f26] text-ink shadow-[0_4px_14px_rgba(232,184,74,0.4)]"
                        : "bg-gradient-to-r from-[#40347a] to-[#2e2662] text-foreground group-hover:from-[#fff1b8] group-hover:via-[#f2c14e] group-hover:to-[#c98f26] group-hover:text-ink"
                    )}
                  >
                    {busy ? "กำลังสร้าง QR..." : `${p.priceBaht} บาท`}
                  </span>
                </button>
              );
            })}
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
                  {describeTransaction(h)}
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

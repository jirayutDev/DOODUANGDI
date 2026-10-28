"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CoinIcon } from "@/components/coin-icon";
import { COIN_ERROR_EVENT, type CoinApiError } from "@/lib/coin-client";
import { loginHref } from "@/lib/safe-next";

const COPY = {
  login_required: {
    title: "เข้าสู่ระบบก่อนนะ",
    fallback: "ต้องเข้าสู่ระบบก่อนถึงจะใช้บริการนี้ได้",
    action: "เข้าสู่ระบบ",
  },
  insufficient_coins: {
    title: "coin ไม่พอ",
    fallback: "coin ของคุณไม่พอสำหรับบริการนี้ เติม coin แล้วกลับมาใช้ต่อได้เลย",
    action: "เติม coin",
  },
} as const;

// กล่องข้อความกลางจอเมื่อต้องล็อกอิน/coin ไม่พอ (แทน toast ที่ไม่เด่น) — handleCoinError ส่งอีเวนต์มาเปิด
export function CoinErrorDialog() {
  const [state, setState] = useState<CoinApiError | null>(null);
  const [next, setNext] = useState("/");

  useEffect(() => {
    function onError(e: Event) {
      const detail = (e as CustomEvent<CoinApiError>).detail;
      if (!detail?.code) return;
      // จำหน้าปัจจุบันไว้ แล้วพากลับมาหลังล็อกอิน
      setNext(window.location.pathname + window.location.search);
      setState(detail);
    }
    window.addEventListener(COIN_ERROR_EVENT, onError);
    return () => window.removeEventListener(COIN_ERROR_EVENT, onError);
  }, []);

  const copy = state?.code ? COPY[state.code] : null;
  const href = state?.code === "login_required" ? loginHref(next) : "/coins";

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && setState(null)}>
      <DialogContent className="items-center text-center sm:max-w-md">
        <DialogHeader className="items-center">
          <CoinIcon count={state?.code === "insufficient_coins" ? 1 : 3} className="h-20 w-28 drop-shadow-[0_6px_10px_rgba(0,0,0,0.4)]" />
          <DialogTitle className="text-[26px] leading-[1.55] font-bold">{copy?.title}</DialogTitle>
          <DialogDescription className="text-base">{state?.error ?? copy?.fallback}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button asChild className="h-auto min-h-[50px] rounded-[14px] px-6 text-base font-bold">
            <Link href={href} onClick={() => setState(null)}>
              {copy?.action}
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => setState(null)} className="h-auto min-h-[44px] rounded-[14px]">
            ไว้ก่อน
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SlipUpload } from "@/components/slip-upload";
import { MEMBERSHIP_PLANS } from "@/lib/membership-plans";

interface CheckoutState {
  paymentId: string;
  ref: string;
  qrDataUrl: string;
  amount: number;
  planName: string;
}

interface MembershipStatus {
  membership: { plan: string; expiresAt: string } | null;
  pendingPayment: { id: string; status: string; purpose: string } | null;
}

export default function MembershipPage() {
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch("/api/membership/status");
    setStatus(await res.json());
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/membership/status")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setStatus(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe(planKey: string) {
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheckout(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้าง QR ไม่สำเร็จ");
    } finally {
      setLoadingPlan(null);
    }
  }

  const activePlan = status?.membership
    ? MEMBERSHIP_PLANS.find((p) => p.key === status.membership?.plan)
    : null;

  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">แพ็กเกจสมาชิก</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.45] md:text-[40px]">
        อยากคุยกับน้องมู
        <br />
        ได้ทั้งวัน?
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        สมาชิกปลดล็อกทุกบริการ (จ่ายด้วย coin) เลือกแพ็กที่ใช่ จ่ายผ่าน PromptPay ได้เลย
      </p>
      <Link href="/coins" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">
        เติม coin <span aria-hidden>›</span>
      </Link>

      {activePlan && status?.membership && (
        <div className="mt-6 border border-primary/40 p-4 text-center text-sm">
          คุณเป็นสมาชิก <span className="font-bold text-primary">{activePlan.name}</span>{" "}
          อยู่แล้ว หมดอายุ{" "}
          {new Date(status.membership.expiresAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      )}

      {status?.pendingPayment && !checkout && (
        <div className="mt-6 border border-line-soft p-4 text-center text-sm text-muted-foreground">
          {status.pendingPayment.status === "awaiting_confirmation"
            ? "มีรายการรอแอดมินตรวจสอบอยู่ — เดี๋ยวอัปเดตให้เร็วๆ นี้นะ"
            : "มีรายการค้างชำระอยู่ กดสมัครแพ็กเกจอีกครั้งเพื่อสร้าง QR ใหม่"}
        </div>
      )}

      {checkout ? (
        <div className="mt-9 flex flex-wrap items-center gap-x-12 gap-y-8">
          <div className="relative h-[220px] w-[220px] shrink-0 overflow-hidden bg-white p-2 text-ink">
            <Image src={checkout.qrDataUrl} alt="PromptPay QR" fill className="object-contain" />
          </div>
          <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-3.5">
            <h2 className="text-[26px] font-bold leading-[1.5]">
              ชำระเงิน {checkout.planName} — {checkout.amount} บาท
            </h2>
            <p className="text-soft-text">
              สแกนจ่ายด้วย PromptPay ผ่านแอปธนาคาร โอนแล้วอัปโหลดสลิป
              ระบบตรวจให้อัตโนมัติ · เลขอ้างอิง{" "}
              <span className="font-mono text-foreground">{checkout.ref}</span>
            </p>
            <SlipUpload
              paymentId={checkout.paymentId}
              onVerified={() => {
                setCheckout(null);
                loadStatus();
                window.dispatchEvent(new Event("coins:changed"));
              }}
              onManualNotified={() => {
                setCheckout(null);
                loadStatus();
              }}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() => setCheckout(null)}
                className="h-auto min-h-[50px] rounded-[14px] px-5"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-9 flex flex-wrap gap-x-8 gap-y-9">
          {MEMBERSHIP_PLANS.map((plan, i) => {
            const best = i === MEMBERSHIP_PLANS.length - 1 && MEMBERSHIP_PLANS.length > 1;
            return (
              <div
                key={plan.key}
                className={`relative flex min-w-0 flex-1 basis-[300px] flex-col gap-2.5 border px-6 pb-6 pt-7 ${
                  best ? "border-primary" : "border-border"
                }`}
              >
                {best && (
                  <span className="absolute -top-[13px] left-5 bg-background px-2.5 text-[17px] text-primary">
                    คุ้มที่สุด
                  </span>
                )}
                <p className="text-4xl font-bold leading-[1.55]">{plan.name}</p>
                <p className="flex items-baseline gap-2">
                  <span className="text-[56px] font-semibold leading-none text-primary">
                    {plan.priceBaht}
                  </span>
                  <span className="text-muted-foreground">บาท / เดือน</span>
                </p>
                <ul className="mb-3 mt-2 border-t border-border">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex gap-3 border-b border-border py-2">
                      <span aria-hidden="true" className="text-primary">
                        —
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan === plan.key}
                  variant={best ? "default" : "secondary"}
                  className="mt-auto h-auto min-h-[50px] w-full rounded-[14px] font-bold"
                >
                  {loadingPlan === plan.key ? "กำลังสร้าง QR..." : `สมัคร ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        ตอนนี้ระบบยืนยันการชำระเงินยังเป็นแบบแจ้งแล้วให้แอดมินตรวจสอบ (ไม่ใช่อัตโนมัติ 100%)
        เพราะยังไม่ได้ต่อ payment gateway จริง
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [notifying, setNotifying] = useState(false);

  async function loadStatus() {
    const res = await fetch("/api/membership/status");
    setStatus(await res.json());
  }

  useEffect(() => {
    loadStatus();
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

  async function handleNotify() {
    if (!checkout) return;
    setNotifying(true);
    try {
      const res = await fetch("/api/membership/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: checkout.paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("แจ้งชำระเงินแล้ว รอแอดมินตรวจสอบนะ");
      setCheckout(null);
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "แจ้งชำระเงินไม่สำเร็จ");
    } finally {
      setNotifying(false);
    }
  }

  const activePlan = status?.membership
    ? MEMBERSHIP_PLANS.find((p) => p.key === status.membership?.plan)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">แพ็กเกจสมาชิก</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        อัปเกรดเพื่อคุยกับน้องมูได้ไม่จำกัด และสิทธิพิเศษอื่นๆ
      </p>

      {activePlan && status?.membership && (
        <Card className="mb-6 border-primary/30 bg-card">
          <CardContent className="p-4 text-center text-sm">
            คุณเป็นสมาชิก <span className="font-display text-primary">{activePlan.name}</span>{" "}
            อยู่แล้ว หมดอายุ{" "}
            {new Date(status.membership.expiresAt).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardContent>
        </Card>
      )}

      {status?.pendingPayment && !checkout && (
        <Card className="mb-6 bg-card">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            {status.pendingPayment.status === "awaiting_confirmation"
              ? "มีรายการรอแอดมินตรวจสอบอยู่ — เดี๋ยวอัปเดตให้เร็วๆ นี้นะ"
              : "มีรายการค้างชำระอยู่ กดสมัครแพ็กเกจอีกครั้งเพื่อสร้าง QR ใหม่"}
          </CardContent>
        </Card>
      )}

      {checkout ? (
        <Card className="mx-auto max-w-sm bg-card">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-lg">
              ชำระเงิน {checkout.planName} — {checkout.amount} บาท
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative h-64 w-64 overflow-hidden rounded-lg bg-white p-2">
              <Image src={checkout.qrDataUrl} alt="PromptPay QR" fill className="object-contain" />
            </div>
            <p className="text-xs text-muted-foreground">
              สแกนจ่ายผ่านแอปธนาคารด้วย PromptPay · เลขอ้างอิง{" "}
              <span className="font-mono text-foreground">{checkout.ref}</span>
            </p>
            <Button onClick={handleNotify} disabled={notifying} className="w-full">
              {notifying ? "กำลังแจ้ง..." : "แจ้งชำระเงินแล้ว"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCheckout(null)}>
              ยกเลิก
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {MEMBERSHIP_PLANS.map((plan) => (
            <Card key={plan.key} className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-display text-lg">
                  {plan.name}
                  <Badge variant="secondary">{plan.priceBaht} บาท/เดือน</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {plan.perks.map((perk) => (
                    <li key={perk}>• {perk}</li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan === plan.key}
                >
                  {loadingPlan === plan.key ? "กำลังสร้าง QR..." : "สมัครแพ็กเกจนี้"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        ตอนนี้ระบบยืนยันการชำระเงินยังเป็นแบบแจ้งแล้วให้แอดมินตรวจสอบ (ไม่ใช่อัตโนมัติ 100%)
        เพราะยังไม่ได้ต่อ payment gateway จริง
      </p>
    </div>
  );
}

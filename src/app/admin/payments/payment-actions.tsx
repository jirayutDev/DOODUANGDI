"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);

  async function act(action: "confirm" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/payments/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "confirm" ? "ยืนยันแล้ว" : "ปฏิเสธแล้ว");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={!!loading} onClick={() => act("confirm")}>
        {loading === "confirm" ? "กำลังยืนยัน..." : "ยืนยันแล้ว"}
      </Button>
      <Button size="sm" variant="ghost" disabled={!!loading} onClick={() => act("reject")}>
        ปฏิเสธ
      </Button>
    </div>
  );
}

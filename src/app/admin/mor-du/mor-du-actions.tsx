"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MorDuActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/mor-du/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={!!loading} onClick={() => act("approve")}>
        {loading === "approve" ? "กำลังอนุมัติ..." : "อนุมัติ"}
      </Button>
      <Button size="sm" variant="ghost" disabled={!!loading} onClick={() => act("reject")}>
        ปฏิเสธ
      </Button>
    </div>
  );
}

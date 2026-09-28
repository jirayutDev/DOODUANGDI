"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import type { BirthProfile } from "@/lib/astrology";
import type { TarotCard } from "@/lib/tarot-data";
import { cn } from "@/lib/utils";

const PROFILE_KEY = "ommu:birth-profile";
const QUOTA_KEY_PREFIX = "ommu:quota:";
const DAILY_QUOTA = 3;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  card?: TarotCard | null;
}

function todayKey() {
  return `${QUOTA_KEY_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "สวัสดีนะ น้องมูเองจ้า วันนี้มีเรื่องอะไรค้างใจ ถามได้เลย 🐭",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [profile, setProfile] = useState<(BirthProfile & { birthDate: string }) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem(PROFILE_KEY);
      if (rawProfile) setProfile(JSON.parse(rawProfile));
      const rawQuota = localStorage.getItem(todayKey());
      if (rawQuota) setQuotaUsed(Number(rawQuota) || 0);
    } catch {
      // ใช้ localStorage ไม่ได้ ก็เริ่มนับจาก 0
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const quotaLeft = Math.max(0, DAILY_QUOTA - quotaUsed);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || quotaLeft <= 0) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          profile,
          history: messages.map(({ role, content }) => ({ role, content })),
          clientQuotaUsed: quotaUsed,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, card: data.card },
      ]);
      setQuotaUsed(data.quotaUsed);
      try {
        localStorage.setItem(todayKey(), String(data.quotaUsed));
      } catch {
        // ข้ามได้ถ้าเก็บไม่ได้
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "น้องมูตอบไม่ทันแฮะ ลองใหม่อีกทีนะ" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem-3.5rem)] max-w-2xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">แชทกับน้องมู</h1>
        <Badge variant={quotaLeft > 0 ? "secondary" : "destructive"}>
          เหลือ {quotaLeft}/{DAILY_QUOTA} ข้อวันนี้
        </Badge>
      </div>

      <ScrollArea className="mb-4 flex-1 rounded-lg border border-border bg-card/50 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.content}
                {m.card && (
                  <Card className="mt-2 overflow-hidden border-primary/30 bg-card">
                    <div className="relative aspect-[7/12] w-24 mx-auto bg-muted">
                      <Image
                        src={m.card.imageUrl}
                        alt={`${m.card.nameTh} (${m.card.nameEn})`}
                        fill
                        sizes="96px"
                        className="object-contain"
                      />
                    </div>
                    <CardContent className="p-3 text-center">
                      <p className="tarot-numeral text-xs">{m.card.nameEn}</p>
                      <p className="font-display text-base">{m.card.nameTh}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                น้องมูกำลังพิมพ์...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {quotaLeft <= 0 ? (
        <p className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
          ครบโควตาวันนี้แล้ว พรุ่งนี้มาถามต่อได้ หรือสมัคร AI Plus เพื่อคุยไม่จำกัด
        </p>
      ) : (
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="พิมพ์คำถามถึงน้องมู..."
            rows={1}
            className="min-h-11 resize-none"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            ส่ง
          </Button>
        </div>
      )}
    </div>
  );
}

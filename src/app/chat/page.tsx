"use client";

import { useStoredJson } from "@/lib/use-stored-json";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { BirthProfile } from "@/lib/astrology";
import type { TarotCard } from "@/lib/tarot-data";
import { Cost } from "@/lib/pricing-client";
import { handleCoinError } from "@/lib/coin-client";

const PROFILE_KEY = "ommu:birth-profile";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  card?: TarotCard | null;
}

// useSearchParams ต้องอยู่ใน Suspense เพื่อให้หน้ายัง prerender ได้
export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "สวัสดีนะ น้องมูเองจ้า วันนี้มีเรื่องอะไรค้างใจ ถามได้เลย 🐭",
    },
  ]);
  // ข้อความจากช่องถามหน้าแรก (?q=) เติมไว้ในช่องให้ ไม่ส่งเองเพราะการถามหัก coin
  const [input, setInput] = useState(() => (searchParams.get("q") ?? "").slice(0, 500));
  const [loading, setLoading] = useState(false);
  const { value: profile } = useStoredJson<BirthProfile & { birthDate: string }>(PROFILE_KEY);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

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
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (!handleCoinError(data)) throw new Error("chat failed");
        // เอาข้อความที่ส่งไม่สำเร็จกลับไปไว้ในช่องพิมพ์
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, card: data.card },
      ]);
      window.dispatchEvent(new Event("coins:changed"));
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
    <div className="mx-auto w-full max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <div className="flex flex-wrap items-start gap-x-16 gap-y-10">
        <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-3.5">
          <p className="text-sm text-muted-foreground">ห้องสนทนา</p>
          <h1 className="mt-0.5 text-[28px] font-bold leading-[1.55] md:text-[40px]">คุยกับน้องมู</h1>
          <p className="text-sm text-muted-foreground">
            ตอบจากวันเกิดของเธอ · ถามข้อละ <Cost feature="chat" /> coin
          </p>

          <div
            ref={scrollRef}
            className="mt-2 max-h-[55dvh] overflow-y-auto border-t border-border"
          >
            {messages.map((m, i) => (
              <div key={i} className="flex gap-4 border-b border-border py-3.5">
                {m.role === "assistant" ? (
                  <span className="w-16 shrink-0 text-xl font-bold leading-normal text-primary">น้องมู</span>
                ) : (
                  <span className="w-16 shrink-0 text-sm leading-normal text-muted-foreground">เธอ</span>
                )}
                <div className="min-w-0 flex-1 text-[17px]">
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.card && (
                    <div className="my-4 flex justify-center">
                      <div className="rounded-xl border border-line-soft p-[5px] text-center">
                        <div className="relative mx-auto aspect-[7/12] w-24 overflow-hidden rounded-xl bg-secondary">
                          <Image
                            src={m.card.imageUrl}
                            alt={`${m.card.nameTh} (${m.card.nameEn})`}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                        <p className="mt-2 text-sm font-semibold tracking-widest text-primary">{m.card.nameEn}</p>
                        <p className="text-base">{m.card.nameTh}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 border-b border-border py-3.5">
                <span className="w-16 shrink-0" />
                <p className="text-[17px] text-muted-foreground">น้องมูกำลังเขียน…</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[16px]">
            <button
              type="button"
              onClick={() => setInput("ขอไพ่ 1 ใบ")}
              className="min-h-10 cursor-pointer border-b border-dashed border-line-soft text-foreground"
            >
              ขอไพ่ 1 ใบ
            </button>
            <button
              type="button"
              onClick={() => setInput("ดวงความรักวันนี้")}
              className="min-h-10 cursor-pointer border-b border-dashed border-line-soft text-foreground"
            >
              ดวงความรักวันนี้
            </button>
            <Link
              href="/mor-du"
              className="inline-flex min-h-10 items-center border-b border-dashed border-line-soft text-foreground no-underline"
            >
              คุยกับหมอดูจริง
            </Link>
          </div>

          {(
            <div className="mt-2 flex items-end gap-3">
              <label className="flex flex-1 flex-col gap-0.5 text-[16px] text-muted-foreground">
                ข้อความถึงน้องมู
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="พิมพ์คำถาม..."
                  rows={1}
                  className="min-h-[50px] w-full resize-none rounded-xl border-0 bg-cream px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink/50"
                />
              </label>
              <button
                type="button"
                aria-label="ส่ง"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          )}
          <p className="text-center text-[16px] text-muted-foreground">
            ถามน้องมู 1 ข้อ ใช้ <Cost feature="chat" /> coin · ต้องเข้าสู่ระบบ
          </p>
        </div>

        <aside className="hidden min-w-0 flex-[1_1_280px] flex-col gap-3.5 pt-[120px] md:flex">
          <div className="rounded-[18px] bg-secondary p-5">
            <p className="text-[17px] text-muted-foreground">จ่ายเท่าที่ใช้</p>
            <p className="mt-0.5 text-[28px] font-bold leading-[1.55]">เติม coin เริ่มต้น 29 บาท</p>
            <p className="mb-4 mt-1.5 text-soft-text">ไม่มีค่ารายเดือน ใช้บริการไหนก็จ่ายด้วย coin ตามที่ใช้ ดวงรายวัน/สัปดาห์/เดือนฟรีเสมอ</p>
            <Link
              href="/coins"
              className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground no-underline"
            >
              เติม coin
            </Link>
          </div>
          <div className="mt-5">
            <h2 className="text-[21px] font-bold leading-normal">อยากคุยลึกกว่านี้?</h2>
            <p className="text-sm text-muted-foreground">ให้หมอดูตัวจริงช่วยดูต่อได้</p>
            <Link href="/mor-du" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary no-underline">
              เลือกหมอดู <span aria-hidden="true">›</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

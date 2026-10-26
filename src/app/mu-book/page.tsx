import Link from "next/link";
import { stripFences } from "@/lib/mu-ai";
import { Button } from "@/components/ui/button";
import { BookTimeline } from "./book-timeline";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

interface TimelineEntry {
  id: string;
  source: "ai" | "mor_du";
  content: string;
  createdAt: Date;
}

async function loadTimeline(): Promise<{ signedIn: boolean; entries: TimelineEntry[] }> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    return { signedIn: false, entries: [] };
  }

  if (!userId) return { signedIn: false, entries: [] };

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: chatMessages.id,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.role, "assistant")))
      .orderBy(desc(chatMessages.createdAt))
      .limit(30);

    return {
      signedIn: true,
      entries: rows.map((r) => ({ id: r.id, source: "ai" as const, content: stripFences(r.content), createdAt: r.createdAt })),
    };
  } catch {
    return { signedIn: true, entries: [] };
  }
}

export default async function MuBookPage() {
  const { signedIn, entries } = await loadTimeline();

  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pb-10 pt-2 md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">สมุดดวง</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">บันทึกคำทำนาย</h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        คำตอบจากน้องมูและหมอดูตัวจริง เก็บไว้ให้ย้อนอ่านได้
      </p>

      {!signedIn && (
        <div className="mt-8 flex flex-col items-center gap-3 border border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">
            เข้าสู่ระบบก่อนเพื่อเริ่มเก็บสมุดดวงของคุณ
          </p>
          <Button asChild className="h-auto min-h-[50px] rounded-[14px] px-6 font-bold">
            <Link href="/chat">ไปคุยกับน้องมู</Link>
          </Button>
        </div>
      )}

      {signedIn && entries.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 border border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">
            ยังไม่มีบันทึกในสมุดดวง ลองไปถามน้องมูดูก่อน
          </p>
          <Button asChild className="h-auto min-h-[50px] rounded-[14px] px-6 font-bold">
            <Link href="/chat">คุยกับน้องมู</Link>
          </Button>
        </div>
      )}

      {entries.length > 0 && (
        <BookTimeline
          entries={entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
        />
      )}

      <div className="mt-16 flex flex-col items-center gap-1 text-center">
        <h2 className="text-[21px] font-bold leading-[1.9]">ยังมีเรื่องอยากถามอีกไหม?</h2>
        <Link
          href="/chat"
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:text-cream"
        >
          คุยกับน้องมู <span aria-hidden="true">›</span>
        </Link>
      </div>
    </div>
  );
}

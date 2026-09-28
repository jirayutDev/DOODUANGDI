import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      entries: rows.map((r) => ({ id: r.id, source: "ai" as const, content: r.content, createdAt: r.createdAt })),
    };
  } catch {
    return { signedIn: true, entries: [] };
  }
}

export default async function MuBookPage() {
  const { signedIn, entries } = await loadTimeline();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl text-foreground">สมุดดวง</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        คำตอบจาก AI น้องมูและหมอดูตัวจริง เก็บไว้เป็นไทม์ไลน์ของคุณ
      </p>

      {!signedIn && (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              เข้าสู่ระบบก่อนเพื่อเริ่มเก็บสมุดดวงของคุณ
            </p>
            <Button asChild>
              <Link href="/chat">ไปคุยกับน้องมู</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {signedIn && entries.length === 0 && (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              ยังไม่มีบันทึกในสมุดดวง ลองไปถามน้องมูดูก่อน
            </p>
            <Button asChild>
              <Link href="/chat">คุยกับน้องมู</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="bg-card">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-display text-sm text-muted-foreground">
                {entry.createdAt.toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              <Badge variant="secondary">{entry.source === "ai" ? "น้องมู" : "หมอดู"}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-foreground">{entry.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

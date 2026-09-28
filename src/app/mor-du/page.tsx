import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { morDus } from "@/db/schema";
import { eq } from "drizzle-orm";

async function loadApprovedMorDus() {
  try {
    const db = getDb();
    return await db.select().from(morDus).where(eq(morDus.status, "approved"));
  } catch {
    return [];
  }
}

export default async function MorDuListPage() {
  const list = await loadApprovedMorDus();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-3xl text-foreground">เลือกหมอดูตัวจริง</h1>
        <p className="text-sm text-muted-foreground">
          ทุกคนผ่านการตรวจสอบตามมาตรฐาน Safe Mu
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/mor-du/apply">สมัครเป็นหมอดูในระบบ</Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีหมอดูเปิดให้บริการตอนนี้ กลับมาเช็กใหม่เร็วๆ นี้นะ
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <Card key={m.userId} className="bg-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">{m.displayName}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="text-muted-foreground">{m.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {m.specialties.split(",").map((s) => (
                    <Badge key={s} variant="secondary">
                      {s.trim()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ถามเป็นข้อ {m.priceQuestion} บาท
                  {m.priceLiveMinute ? ` · แชทสด ${m.priceLiveMinute} บาท/นาที` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

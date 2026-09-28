import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDailyCard } from "@/lib/tarot-data";

const HIGHLIGHTS = [
  {
    title: "AI น้องมู รู้ดวงคุณจริง",
    body: "ถามได้ทุกเวลา ตอบจากวันเกิดของคุณโดยเฉพาะ อยากคุยลึกกว่านี้ส่งต่อหมอดูตัวจริงได้ในปุ่มเดียว",
  },
  {
    title: "ไพ่เทพฮินดู ไม่ซ้ำใคร",
    body: "ไพ่ประจำวันแบบแชร์ได้ วาดขึ้นเฉพาะที่นี่ที่เดียว หาที่ไหนไม่ได้อีกแล้ว",
  },
  {
    title: "เลือกหมอดูได้อย่างมั่นใจ",
    body: "ทุกคนผ่านการตรวจสอบตามมาตรฐาน Safe Mu พร้อมคะแนน \"แม่นไหม?\" จากคนที่เคยดูจริง",
  },
];

export default function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const dailyCard = getDailyCard(today);

  return (
    <div className="bg-starfield">
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center">
        <Badge variant="secondary" className="rounded-full">
          สมัครฟรี · ถามได้ทุกวัน
        </Badge>
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">
          มีเรื่องค้างใจ <span className="text-primary">ถามได้เลย</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          เก็บวันเกิดแล้วมี AI น้องมูที่รู้ดวงของคุณตอบได้ทันที
          อยากลึกกว่านั้นระบบหาหมอดูตัวจริงที่ใช่ให้ หรือเลือกเองก็ได้
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profile">กรอกวันเกิด ดูดวงฟรี</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/chat">คุยกับน้องมูเลย</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <Card className="mx-auto max-w-sm rounded-[var(--radius-card)] border-primary/30 bg-card">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-lg">ไพ่ประจำวันนี้</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <div className="relative aspect-[7/12] w-40 overflow-hidden rounded-xl bg-muted">
              <Image
                src={dailyCard.imageUrl}
                alt={`${dailyCard.nameTh} (${dailyCard.nameEn})`}
                fill
                sizes="160px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">{dailyCard.nameTh}</p>
              <p className="tarot-numeral text-sm">{dailyCard.nameEn}</p>
            </div>
            <p className="text-sm text-muted-foreground">{dailyCard.keywords}</p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/tarot/${dailyCard.slug}`}>อ่านความหมายเต็ม</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Card key={item.title} className="bg-card">
            <CardHeader>
              <CardTitle className="font-display text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

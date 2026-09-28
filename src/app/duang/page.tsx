import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DIVINATION_GROUPS } from "@/lib/divination-categories";

export const metadata: Metadata = {
  title: "ทุกศาสตร์ดูดวง | ดูดวงดิ",
  description: "รวมทุกศาสตร์ดูดวงในที่เดียว ทั้งที่ AI น้องมูตอบให้ได้เลย และที่ต้องหาหมอดูตัวจริง",
};

export default function DuangHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="mb-2 font-display text-3xl text-foreground">ทุกศาสตร์ดูดวง</h1>
        <p className="text-sm text-muted-foreground">
          บางเรื่องน้องมูตอบให้ได้ทันที บางเรื่องต้องใช้ความชำนาญของหมอดูตัวจริง — เลือกดูได้เลยว่าอยากรู้เรื่องไหน
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {DIVINATION_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-4 font-display text-xl text-primary">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.categories.map((cat) => (
                <Link key={cat.slug} href={cat.href}>
                  <Card className="h-full bg-card transition-colors hover:border-primary/50">
                    <CardContent className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-base text-foreground">{cat.name}</p>
                        {cat.status === "coming_soon" && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            เร็วๆ นี้
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.blurb}</p>
                      <Badge
                        variant="secondary"
                        className="w-fit text-[10px]"
                      >
                        {cat.mode === "ai" ? "น้องมูตอบให้เลย" : "หมอดูตัวจริง"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

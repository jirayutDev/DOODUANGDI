"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/profile", label: "ดวงโปรไฟล์" },
  { href: "/chat", label: "แชทน้องมู" },
  { href: "/mu-book", label: "สมุดดวง" },
  { href: "/reading", label: "เปิดไพ่" },
  { href: "/duang", label: "ทุกศาสตร์" },
  { href: "/mor-du", label: "หมอดู" },
  { href: "/membership", label: "สมาชิก" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="shrink-0 font-display text-lg text-primary sm:text-xl">
          DOODUANGD
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {email ? (
            <>
              <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:inline">
                {email}
              </span>
              <Button size="sm" variant="ghost" onClick={handleSignOut}>
                ออกจากระบบ
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { avatarInitial } from "@/lib/auth-user";
import { loginHref } from "@/lib/safe-next";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/reading", label: "เปิดไพ่" },
  { href: "/tarot", label: "ไพ่ 78 ใบ" },
  { href: "/chat", label: "น้องมู" },
  { href: "/duang", label: "ทุกศาสตร์" },
  { href: "/mor-du", label: "หมอดู" },
  { href: "/mu-book", label: "สมุดดวง" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// ส่วนหัว V2: ต่ำกว่า lg (มือถือ/แท็บเล็ต) มีแค่โลโก้ + coin + ปุ่มดวงของฉัน และใช้เมนูล่าง,
// lg ขึ้นไปมีเมนูบนเต็ม, xl ขึ้นไปมีปุ่มโปรไฟล์/ออกจากระบบแยก (จอแคบกว่านั้นที่ว่างไม่พอ จะไม่ให้ตัวหนังสือตัดบรรทัด)
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const signedIn = !!user;

  // ยอด coin บนเมนู: โหลดเมื่อล็อกอิน และรีโหลดเมื่อหน้าอื่นยิง event "coins:changed"
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const load = () =>
      fetch("/api/coins/balance")
        .then((r) => r.json())
        .then((d: { balance?: number }) => {
          if (!cancelled) setCoins(d.balance ?? 0);
        })
        .catch(() => {});
    load();
    window.addEventListener("coins:changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("coins:changed", load);
    };
  }, [signedIn]);

  async function handleSignOut() {
    try {
      localStorage.removeItem("ommu:birth-profile");
    } catch {
      // localStorage ใช้ไม่ได้ก็ข้ามไป
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const pill = "inline-flex min-h-[38px] items-center whitespace-nowrap rounded-full px-2.5 text-[16px] transition-colors";

  return (
    <header className="bg-background">
      <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-[18px] py-3.5 md:gap-4 md:px-10 md:py-4 lg:gap-6">
        <Link href="/" className="shrink-0 whitespace-nowrap font-display text-[26px] leading-normal font-bold text-primary min-[360px]:text-[28px] md:text-[32px]">
          ดูดวงดิ
        </Link>

        <nav aria-label="เมนูหลัก" className="hidden gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(pill, active ? "bg-cream font-semibold text-ink" : "text-soft-text hover:text-foreground")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap md:gap-2 text-[16px]">
          {signedIn && (
            <Link
              href="/coins"
              aria-label="กระเป๋า coin"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-soft px-2.5 text-sm font-semibold text-primary md:px-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" strokeLinecap="round" />
              </svg>
              {coins ?? "–"}
            </Link>
          )}
          {user ? (
            <>
              <Link
                href="/me"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm md:px-3.5 xl:hidden"
              >
                <span className="hidden size-6 items-center justify-center min-[360px]:inline-flex rounded-full bg-primary text-xs font-bold text-ink">
                  {avatarInitial(user)}
                </span>
                ดวงของฉัน
              </Link>
              <Link
                href="/profile"
                aria-current={pathname.startsWith("/profile") ? "page" : undefined}
                className="hidden min-h-10 items-center rounded-full bg-secondary px-4 text-foreground xl:inline-flex"
              >
                โปรไฟล์
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden min-h-10 items-center rounded-full bg-secondary px-4 text-foreground xl:inline-flex"
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <Link href={pathname.startsWith("/login") || pathname.startsWith("/auth") ? "/login" : loginHref(pathname)} className="inline-flex min-h-10 items-center rounded-full bg-secondary px-[18px] text-sm text-foreground md:text-[16px]">
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", label: "หน้าแรก", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/reading", label: "เปิดไพ่", icon: "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 9l1.5 3L12 15l-1.5-3z" },
  { href: "/chat", label: "น้องมู", icon: "M4 5h16v11H9l-5 4z" },
  { href: "/duang", label: "ทุกศาสตร์", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { href: "/me", label: "ฉัน", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6" },
];

// เมนูล่างสำหรับมือถือ
export function BottomBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="เมนูล่าง"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-5 border-t border-border bg-background px-1.5 pt-1.5 pb-3 text-center text-xs lg:hidden"
    >
      {TABS.map((t) => {
        const active = isActive(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center justify-center gap-0.5 whitespace-nowrap", active ? "font-semibold text-primary" : "text-muted-foreground")}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

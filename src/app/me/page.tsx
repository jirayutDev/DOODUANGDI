"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { displayName } from "@/lib/auth-user";
import { loginHref } from "@/lib/safe-next";
import type { User } from "@supabase/supabase-js";

const LINKS = [
  { href: "/profile", title: "โปรไฟล์ของฉัน", sub: "วันเกิด การใช้ coin และกิจกรรม" },
  { href: "/mu-book", title: "สมุดดวง", sub: "คำทำนายที่เคยได้" },
  { href: "/daily-horoscope", title: "ดวงรายวัน", sub: "เช็กพลังงานวันนี้" },
  { href: "/mor-du", title: "ปรึกษาหมอดูตัวจริง", sub: "ผ่านการตรวจสอบ Safe Mu" },
  { href: "/coins", title: "กระเป๋า coin", sub: "เติม coin และดูประวัติ" },
  { href: "/mor-du/apply", title: "สมัครเป็นหมอดู", sub: "สำหรับหมอดูที่อยากเข้าระบบ" },
];

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [coin, setCoin] = useState<{ balance: number; member: boolean } | null>(null);

  useEffect(() => {
    const load = () => {
      fetch("/api/coins/balance")
        .then((r) => r.json())
        .then((d: { loggedIn?: boolean; balance?: number; member?: boolean }) =>
          setCoin(d.loggedIn ? { balance: d.balance ?? 0, member: !!d.member } : null)
        )
        .catch(() => setCoin(null));
    };
    load();
    window.addEventListener("coins:changed", load);
    return () => window.removeEventListener("coins:changed", load);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoaded(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

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

  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pt-2 pb-10 md:px-10 md:pt-8 md:pb-20">
      <p className="text-sm text-muted-foreground">บัญชีของฉัน</p>
      <h1 className="mt-0.5 text-[28px] leading-[1.9] font-bold break-all md:text-[40px]">
        {!loaded ? "\u00a0" : user ? displayName(user) : "ยังไม่ได้เข้าสู่ระบบ"}
      </h1>
      {loaded && !user && (
        <p className="mt-0.5 text-[19px] text-primary">เข้าสู่ระบบเพื่อเก็บสมุดดวงและโปรไฟล์ของคุณ</p>
      )}

      <div className="mt-8 flex flex-wrap items-start gap-x-16 gap-y-10">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
          <ul>
            <li className="border-b border-border">
              <Link href="/coins" className="flex min-h-[60px] items-center gap-3.5 py-2 text-foreground">
                <span className="flex flex-1 flex-col leading-normal">
                  <span className="text-base font-semibold">
                    coin ของฉัน{coin ? `: ${coin.balance.toLocaleString("th-TH")}` : ""}
                  </span>
                  <span className="text-[16px] text-muted-foreground">เติม coin / แลกโค้ด</span>
                </span>
                <span aria-hidden="true" className="text-xl text-muted-foreground">
                  ›
                </span>
              </Link>
            </li>
            {LINKS.map((l) => (
              <li key={l.href} className="border-b border-border">
                <Link href={l.href} className="flex min-h-[60px] items-center gap-3.5 py-2 text-foreground">
                  <span className="flex flex-1 flex-col leading-normal">
                    <span className="text-base font-semibold">{l.title}</span>
                    <span className="text-[16px] text-muted-foreground">{l.sub}</span>
                  </span>
                  <span aria-hidden="true" className="text-xl text-muted-foreground">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {loaded &&
            (user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-11 self-start text-muted-foreground underline"
              >
                ออกจากระบบ
              </button>
            ) : (
              <Link href={loginHref("/me")} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
                เข้าสู่ระบบ
              </Link>
            ))}
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <div className="rounded-[18px] bg-card p-5">
            <p className="text-[17px] text-muted-foreground">แนะนำ</p>
            <p className="mt-0.5 text-[30px] leading-[1.9] font-bold">เติม coin ใช้บริการ</p>
            <p className="mt-1.5 mb-4 text-soft-text">ไม่มีค่ารายเดือน จ่ายเท่าที่ใช้ เริ่มต้น 29 บาท</p>
            <Link
              href="/coins"
              className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-primary px-6 font-bold text-primary-foreground"
            >
              เติม coin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

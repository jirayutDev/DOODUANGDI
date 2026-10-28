"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  Cpu,
  CreditCard,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Sparkles,
  Tag,
  Ticket,
  Users,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/app/admin/logout-button";

const ITEMS = [
  { href: "", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/payments", label: "การชำระเงิน", icon: CreditCard, badgeKey: "payments" },
  { href: "/users", label: "ผู้ใช้และ coin", icon: Users },
  { href: "/codes", label: "โค้ดแลก coin", icon: Ticket },
  { href: "/ledger", label: "ความเคลื่อนไหว coin", icon: ListOrdered },
  { href: "/mor-du", label: "หมอดู", icon: Sparkles, badgeKey: "morDu" },
  { href: "/bookings", label: "การจองคิวหมอดู", icon: CalendarCheck },
  { href: "/payouts", label: "โอนเงินหมอดู", icon: Banknote },
  { href: "/horoscopes", label: "ดวงที่สร้างล่วงหน้า", icon: CalendarClock },
  { href: "/ai-usage", label: "ต้นทุน AI", icon: Cpu },
  { href: "/pricing", label: "ตั้งราคา", icon: Tag },
] as const;

export function AdminSidebar({ base, badges }: { base: string; badges: { payments: number; morDu: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="เมนูแอดมิน" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {ITEMS.map((item) => {
        const full = `${base}${item.href}`;
        const active = item.href === "" ? pathname === full || pathname === `${full}/` : pathname === full || pathname.startsWith(`${full}/`);
        const count = "badgeKey" in item ? badges[item.badgeKey] : 0;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={full || "/"}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
              active ? "bg-primary/15 font-semibold text-primary" : "text-soft-text hover:bg-card hover:text-foreground"
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {count > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* แถบบนสำหรับมือถือ */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-2 md:hidden">
        <span className="font-bold text-primary">หลังบ้าน ดูดวงดิ</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
          className="inline-flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-card"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-[#1a1636] transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="hidden border-b border-border px-5 py-4 md:block">
          <p className="text-xl font-bold text-primary">ดูดวงดิ</p>
          <p className="text-xs text-muted-foreground">ระบบหลังบ้าน</p>
        </div>
        {nav}
        <div className="flex flex-col gap-1 border-t border-border p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-soft-text hover:bg-card hover:text-foreground"
          >
            <ExternalLink className="size-[18px]" aria-hidden="true" />
            ดูหน้าเว็บ
          </a>
          <div className="px-1">
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}

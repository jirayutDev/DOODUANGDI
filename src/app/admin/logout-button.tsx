"use client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = `${window.location.pathname.replace(/\/$/, "")}/login`;
  }
  return (
    <Button variant="ghost" size="sm" className="min-h-10" onClick={logout}>
      ออกจากระบบ
    </Button>
  );
}

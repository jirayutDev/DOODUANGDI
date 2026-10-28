import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin";
import { adminBase } from "@/lib/admin-path";
import { getDb } from "@/db";
import { coinCodes } from "@/db/schema";
import { CodeForm } from "./code-form";
import { CodeToggle } from "./code-toggle";

export default async function AdminCodesPage() {
  const admin = await getAdminUser();
  if (!admin) redirect(`${adminBase()}/login`);

  const list = await getDb().select().from(coinCodes).orderBy(desc(coinCodes.createdAt)).limit(100);

  return (
    <div className="mx-auto max-w-2xl px-[18px] pb-10 pt-2 md:px-10 md:pt-8">
      <h1 className="mb-6 text-[28px] font-bold leading-[1.9]">โค้ดแลก coin</h1>
      <CodeForm />
      <ul className="mt-8">
        {list.map((c) => (
          <li key={c.code} className="flex items-center justify-between border-b border-border py-2.5 text-sm">
            <span className={c.active ? "" : "opacity-50"}>
              <span className="font-mono text-base text-foreground">{c.code}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {c.coins} coin · ใช้แล้ว {c.usedCount}/{c.maxUses}
                {c.expiresAt ? ` · หมดอายุ ${new Date(c.expiresAt).toLocaleDateString("th-TH")}` : ""}
                {c.active ? "" : " · ปิดอยู่"}
              </span>
            </span>
            <CodeToggle code={c.code} active={c.active} />
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted-foreground">ยังไม่มีโค้ด</li>}
      </ul>
    </div>
  );
}

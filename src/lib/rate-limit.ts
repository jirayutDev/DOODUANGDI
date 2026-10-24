import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// ตัวจำกัดความถี่แบบเก็บใน Postgres (ใช้ร่วมกันได้ทุก instance ของ serverless)
// คืน true ถ้ายังไม่เกินโควตา — นับทุกครั้งที่เรียก; key ควรมี userId หรือ IP นำหน้า เช่น "slip:<userId>"
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000);
  const rows = await getDb().execute<{ count: number }>(sql`
    insert into rate_limits (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then now() else rate_limits.window_start end
    returning count
  `);
  const count = Number((rows as unknown as { count: number }[])[0]?.count ?? 1);
  return count <= max;
}

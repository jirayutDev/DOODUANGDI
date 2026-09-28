import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// lazy singleton กัน serverless เปิด connection ซ้ำทุก hot reload
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function getClient() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ไม่ได้ตั้งค่า — คัดลอก .env.example เป็น .env.local แล้วใส่ค่า Supabase connection string"
    );
  }
  if (!globalForDb.pgClient) {
    globalForDb.pgClient = postgres(connectionString, { prepare: false });
  }
  return globalForDb.pgClient;
}

// เรียก getDb() ตอนใช้งานจริงเท่านั้น (ไม่ throw ตอน import) เพื่อให้หน้าเว็บ
// fallback ไปใช้ demo data ได้เวลายังไม่ได้ต่อ Supabase จริง
export function getDb() {
  return drizzle(getClient(), { schema });
}

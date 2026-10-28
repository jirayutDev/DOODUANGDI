import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit ไม่อ่าน .env.local เอง จึงโหลดแบบเดียวกับ Next.js (.env.local ฯลฯ) ก่อนอ่าน DATABASE_URL
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

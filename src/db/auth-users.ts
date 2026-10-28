import { jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ตารางผู้ใช้ของ Supabase Auth (อ่านอย่างเดียว) ใช้ในหลังบ้านเพื่อแสดงผู้สมัครทุกคน แม้ยังไม่กรอกโปรไฟล์
// แยกไฟล์จาก schema.ts ตั้งใจ: drizzle-kit อ่านเฉพาะ schema.ts จึงไม่พยายามสร้าง/แก้ตารางของ Supabase
const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
  meta: jsonb("raw_user_meta_data"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

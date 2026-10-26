import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  time,
  integer,
  pgEnum,
  boolean,
  check,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);
export const muBookSourceEnum = pgEnum("mu_book_source", ["ai", "mor_du"]);
export const morDuStatusEnum = pgEnum("mor_du_status", ["pending", "approved", "rejected", "suspended"]);
export const paymentPurposeEnum = pgEnum("payment_purpose", ["ai_plus", "mu_club", "coin_topup"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", // สร้าง QR แล้ว รอผู้ใช้จ่าย
  "awaiting_confirmation", // ผู้ใช้กด "แจ้งชำระเงินแล้ว"
  "confirmed", // แอดมินตรวจสอบแล้วว่าเงินเข้าจริง
  "rejected",
]);
export const membershipPlanEnum = pgEnum("membership_plan", ["ai_plus", "mu_club"]);

// Mirrors Supabase auth.users (id) — profile data ผู้ใช้ + ผลคำนวณดวงโปรไฟล์
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  fullName: text("full_name"),
  birthDate: date("birth_date").notNull(),
  birthTime: time("birth_time"),
  birthProvince: text("birth_province"),
  gender: genderEnum("gender"),
  zodiacSign: text("zodiac_sign"),
  thaiBirthDay: text("thai_birth_day"),
  chineseZodiac: text("chinese_zodiac"),
  lifePathNumber: integer("life_path_number"),
  luckyColor: text("lucky_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ไพ่ทาโรต์เทพฮินดู 78 ใบ (เริ่มจากชุดใหญ่ 22 ใบ)
export const tarotCards = pgTable("tarot_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  number: integer("number").notNull(),
  nameTh: text("name_th").notNull(),
  nameEn: text("name_en").notNull(),
  deity: text("deity").notNull(),
  keywords: text("keywords").notNull(),
  uprightMeaning: text("upright_meaning").notNull(),
  reversedMeaning: text("reversed_meaning"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ไพ่ประจำวัน ผูกกับผู้ใช้ + วันที่ เพื่อกันสุ่มซ้ำในวันเดียวกัน
export const dailyCardDraws = pgTable("daily_card_draws", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  cardId: uuid("card_id")
    .notNull()
    .references(() => tarotCards.id),
  drawDate: date("draw_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ประวัติแชท AI น้องมู — ใช้คำนวณโควตา 3 ข้อ/วัน และแสดงในสมุดดวง
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  tarotCardId: uuid("tarot_card_id").references(() => tarotCards.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// สมุดดวง — ไทม์ไลน์คำตอบจาก AI และหมอดูตัวจริง (เฟส 2 เติม source = mor_du)
export const muBookEntries = pgTable("mu_book_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  source: muBookSourceEnum("source").notNull().default("ai"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ใบสมัครหมอดู — สมัครฟรี รอแอดมินอนุมัติก่อนขึ้นแสดงในหน้าตลาดหมอดู (ดูหัวข้อ "ฝั่งหมอดู" ในแผน)
export const morDus = pgTable("mor_dus", {
  userId: uuid("user_id").primaryKey(), // = auth.users.id
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull(),
  specialties: text("specialties").notNull(), // คั่นด้วยจุลภาค เช่น "ไพ่ยิปซี, โหราศาสตร์ไทย"
  priceQuestion: integer("price_question").notNull(), // บาทต่อ 1 คำถาม (ถามเป็นข้อ)
  priceLiveMinute: integer("price_live_minute"), // บาทต่อนาที (แชทสด/โทร) — ไม่บังคับ
  status: morDuStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// รายการชำระเงินค่าสมาชิก AI Plus / Mu Club ผ่าน PromptPay
// ยังไม่มี payment gateway จริง เลยใช้ flow แจ้งชำระเงิน + แอดมินกดยืนยันมือ (ดู README ส่วน "การเงิน")
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  purpose: paymentPurposeEnum("purpose").notNull(),
  amountBaht: integer("amount_baht").notNull(),
  coins: integer("coins"), // เฉพาะ purpose = coin_topup: จำนวน coin ที่จะได้เมื่อยืนยัน
  status: paymentStatusEnum("status").notNull().default("pending"),
  promptpayRef: text("promptpay_ref").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  slipTransRef: text("slip_trans_ref").unique(), // เลขอ้างอิงธุรกรรมจากสลิปที่ Slip2Go ยืนยัน กันใช้สลิปซ้ำ
});

// สถานะสมาชิกปัจจุบันของผู้ใช้ (1 คนมีได้ 1 แพ็กเกจที่ active ในแต่ละช่วงเวลา)
export const memberships = pgTable("memberships", {
  userId: uuid("user_id").primaryKey(),
  plan: membershipPlanEnum("plan").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastPaymentId: uuid("last_payment_id").references(() => payments.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// กระเป๋า coin ของผู้ใช้ — balance ห้ามติดลบ ตัด coin ด้วย UPDATE ... WHERE balance >= n เพื่อกันกดซ้อน
export const coinWallets = pgTable(
  "coin_wallets",
  {
    userId: uuid("user_id").primaryKey(),
    balance: integer("balance").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("coin_wallets_balance_nonneg", sql`${t.balance} >= 0`)]
);

// สมุดบัญชี coin: amount บวก = ได้รับ, ลบ = ใช้จ่าย
export const coinTransactions = pgTable(
  "coin_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    amount: integer("amount").notNull(),
    kind: text("kind").notNull(), // topup | code | bonus | spend | refund
    ref: text("ref"), // feature key, payment id หรือโค้ด
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("coin_transactions_user_created_idx").on(t.userId, t.createdAt.desc())]
);

// โค้ดแลก coin — แอดมินสร้าง ใช้ได้คนละครั้ง จำกัดจำนวนครั้งรวมและวันหมดอายุได้
export const coinCodes = pgTable("coin_codes", {
  code: text("code").primaryKey(), // เก็บเป็นตัวพิมพ์ใหญ่
  coins: integer("coins").notNull(),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coinCodeRedemptions = pgTable(
  "coin_code_redemptions",
  {
    code: text("code").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.code, t.userId] })]
);

// ดวงราศีรายวัน/สัปดาห์/เดือน ที่สร้างล่วงหน้าตามตาราง (cron) — 1 แถวต่อ (ชนิด, ช่วงเวลา, ราศี) ทุกคนอ่านค่าเดียวกัน ไม่เรียก AI ตอนผู้ใช้เปิดหน้า
export const scheduledHoroscopes = pgTable(
  "scheduled_horoscopes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(), // daily | weekly | monthly
    periodKey: text("period_key").notNull(), // daily: 2569-10-24 (ค.ศ. YYYY-MM-DD) | weekly: วันอาทิตย์ต้นสัปดาห์ | monthly: YYYY-MM
    sign: text("sign").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("scheduled_horoscopes_uniq").on(t.kind, t.periodKey, t.sign)]
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  chatMessages: many(chatMessages),
  muBookEntries: many(muBookEntries),
  dailyCardDraws: many(dailyCardDraws),
}));

export const tarotCardsRelations = relations(tarotCards, ({ many }) => ({
  dailyCardDraws: many(dailyCardDraws),
  chatMessages: many(chatMessages),
}));

// ตัวนับสำหรับจำกัดความถี่ (ดู src/lib/rate-limit.ts) — 1 แถวต่อ key ต่อหน้าต่างเวลา
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).defaultNow().notNull(),
});

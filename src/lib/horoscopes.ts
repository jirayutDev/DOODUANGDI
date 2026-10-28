import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scheduledHoroscopes } from "@/db/schema";
import { ZODIAC_SIGN_NAMES } from "@/lib/astrology";
import { generateZodiacHoroscope } from "@/lib/mu-ai";
import { summarizeSkyForPrompt, summarizeSkyForSign } from "@/lib/ephemeris";

export type HoroscopeKind = "daily" | "weekly" | "monthly";

// ตำแหน่งดาวจริงของช่วงเวลานั้น คำนวณจาก periodKey (เที่ยงวันเวลาไทย = 05:00 UTC) ถ้าคำนวณไม่ได้ก็ปล่อยให้ AI เขียนโดยไม่มีบริบทดาว
function skyContextFor(kind: HoroscopeKind, periodKey: string, sign: string): string | undefined {
  try {
    const day = kind === "monthly" ? `${periodKey}-01` : periodKey;
    const at = new Date(`${day}T05:00:00Z`);
    return [summarizeSkyForPrompt(at, kind), summarizeSkyForSign(at, kind, sign)].filter(Boolean).join("\n");
  } catch (e) {
    console.error("ephemeris failed:", e instanceof Error ? e.message : "unknown");
    return undefined;
  }
}

export function isHoroscopeKind(v: unknown): v is HoroscopeKind {
  return v === "daily" || v === "weekly" || v === "monthly";
}

export function isZodiacSign(v: unknown): v is string {
  return typeof v === "string" && ZODIAC_SIGN_NAMES.includes(v);
}

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// เวลาไทย (UTC+7) เป็น Date ที่อ่านด้วย getUTC* — ใช้ตัดรอบวัน/สัปดาห์/เดือนให้ตรงเที่ยงคืนไทย
export function thaiNow(now = new Date()): Date {
  return new Date(now.getTime() + THAI_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

export interface Period {
  key: string;
  name: string; // ใช้ในพรอมต์ เช่น "สัปดาห์นี้"
  label: string; // ข้อความช่วงเวลาให้ AI และหน้าเว็บ
  sentences: string;
}

export function getPeriod(kind: HoroscopeKind, now = new Date()): Period {
  const t = thaiNow(now);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const d = t.getUTCDate();
  if (kind === "daily") {
    return {
      key: `${y}-${pad(m + 1)}-${pad(d)}`,
      name: "วันนี้",
      label: `วันที่ ${d} ${THAI_MONTHS[m]} ${y + 543}`,
      sentences: "3-4",
    };
  }
  if (kind === "weekly") {
    // สัปดาห์เริ่มวันอาทิตย์ (ตรงกับรอบ cron ที่รันเที่ยงคืนวันอาทิตย์)
    const start = new Date(Date.UTC(y, m, d - t.getUTCDay()));
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const f = (x: Date) => `${x.getUTCDate()} ${THAI_MONTHS[x.getUTCMonth()]}`;
    return {
      key: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`,
      name: "สัปดาห์นี้",
      label: `${f(start)} - ${f(end)} ${end.getUTCFullYear() + 543}`,
      sentences: "4-5",
    };
  }
  return {
    key: `${y}-${pad(m + 1)}`,
    name: "เดือนนี้",
    label: `เดือน${THAI_MONTHS[m]} ${y + 543}`,
    sentences: "5-6",
  };
}

async function findOne(kind: HoroscopeKind, key: string, sign: string) {
  const [row] = await getDb()
    .select({ content: scheduledHoroscopes.content })
    .from(scheduledHoroscopes)
    .where(
      and(
        eq(scheduledHoroscopes.kind, kind),
        eq(scheduledHoroscopes.periodKey, key),
        eq(scheduledHoroscopes.sign, sign)
      )
    )
    .limit(1);
  return row?.content ?? null;
}

// รวมคำขอที่สร้างพร้อมกันของ (kind, period, sign) เดียวกันใน instance นี้ให้เรียก AI ครั้งเดียว
const inFlight = new Map<string, Promise<string | null>>();
// จำความล้มเหลวของ AI ไว้สั้นๆ กันการ retry รัวๆ ยิงโมเดลซ้ำ
const FAILURE_TTL_MS = 60 * 1000;
const failedAt = new Map<string, number>();

async function generateAndStore(kind: HoroscopeKind, sign: string, period: Period, flightKey: string) {
  try {
    const existing = await findOne(kind, period.key, sign);
    if (existing) return existing;

    const content = await generateZodiacHoroscope({
      sign,
      periodName: period.name,
      periodLabel: period.label,
      sentences: period.sentences,
      skyContext: skyContextFor(kind, period.key, sign),
    });
    if (!content) {
      failedAt.set(flightKey, Date.now());
      return null;
    }
    failedAt.delete(flightKey);

    await getDb()
      .insert(scheduledHoroscopes)
      .values({ kind, periodKey: period.key, sign, content })
      .onConflictDoNothing();
    // ถ้ามีคนสร้างพร้อมกัน ให้ทุกคนได้ค่าที่ถูกเก็บไว้จริงอันเดียวกัน
    return (await findOne(kind, period.key, sign)) ?? content;
  } finally {
    inFlight.delete(flightKey);
  }
}

// สร้างและเก็บดวง 1 ราศี ถ้ายังไม่มีของช่วงนี้ — AI ล้มเหลวจะไม่เก็บอะไร (คืน null)
export async function ensureHoroscope(kind: HoroscopeKind, sign: string, period = getPeriod(kind)) {
  const existing = await findOne(kind, period.key, sign);
  if (existing) return existing;

  const flightKey = `${kind}|${period.key}|${sign}`;
  const pending = inFlight.get(flightKey);
  if (pending) return pending;

  const failed = failedAt.get(flightKey);
  if (failed !== undefined) {
    if (Date.now() - failed < FAILURE_TTL_MS) return null;
    failedAt.delete(flightKey);
  }

  const promise = generateAndStore(kind, sign, period, flightKey);
  inFlight.set(flightKey, promise);
  return promise;
}

// อ่านอย่างเดียว ไม่เรียก AI — ใช้เมื่ออยากรู้ว่า cron เตรียมไว้แล้วหรือยัง
export async function readHoroscope(kind: HoroscopeKind, sign: string, period = getPeriod(kind)) {
  return findOne(kind, period.key, sign);
}

// รหัสช่วงเวลาที่ cron/แอดมินจะสร้างให้ตอนนี้ (บวก 30 นาทีให้ตรงกับ generateAllSigns)
export function currentGenerationPeriodKey(kind: HoroscopeKind): string {
  return getPeriod(kind, new Date(Date.now() + 30 * 60 * 1000)).key;
}

// สร้างดวง 1 ราศีของช่วงปัจจุบัน (1 คำขอ = 1 การเรียก AI) — ใช้กับโฮสต์ที่จำกัดเวลาฟังก์ชันสั้น แล้วให้ตัวเรียกวนทีละราศีเอง
// regenerate = สร้างข้อความใหม่แล้วเขียนทับของเดิม (ถ้า AI ล้มเหลวของเดิมยังอยู่ ไม่หายไป)
export async function generateSign(kind: HoroscopeKind, sign: string, opts: { regenerate?: boolean } = {}) {
  const period = getPeriod(kind, new Date(Date.now() + 30 * 60 * 1000));
  if (!opts.regenerate) {
    if (await findOne(kind, period.key, sign)) return { period: period.key, sign, status: "skipped" as const };
    const content = await ensureHoroscope(kind, sign, period);
    return { period: period.key, sign, status: content ? ("created" as const) : ("failed" as const) };
  }

  const content = await generateZodiacHoroscope({
    sign,
    periodName: period.name,
    periodLabel: period.label,
    sentences: period.sentences,
    skyContext: skyContextFor(kind, period.key, sign),
  });
  if (!content) return { period: period.key, sign, status: "failed" as const };
  await getDb()
    .insert(scheduledHoroscopes)
    .values({ kind, periodKey: period.key, sign, content })
    .onConflictDoUpdate({
      target: [scheduledHoroscopes.kind, scheduledHoroscopes.periodKey, scheduledHoroscopes.sign],
      set: { content, createdAt: new Date() },
    });
  return { period: period.key, sign, status: "created" as const };
}

// regenerate = ลบของช่วงนี้ทิ้งแล้วสร้างใหม่ (แอดมินกดสร้างใหม่เมื่อดวงที่ได้เพี้ยน)
export async function generateAllSigns(kind: HoroscopeKind, opts: { regenerate?: boolean } = {}) {
  // คิดจากเวลา +30 นาที เผื่อ scheduler ยิงก่อนเที่ยงคืนเล็กน้อย จะได้เติมของวัน/สัปดาห์/เดือนใหม่ถูกต้อง
  const period = getPeriod(kind, new Date(Date.now() + 30 * 60 * 1000));
  if (opts.regenerate) {
    await getDb()
      .delete(scheduledHoroscopes)
      .where(and(eq(scheduledHoroscopes.kind, kind), eq(scheduledHoroscopes.periodKey, period.key)));
  }
  const results = { period: period.key, created: 0, skipped: 0, failed: [] as string[] };
  const queue = [...ZODIAC_SIGN_NAMES];

  // รัน 4 ราศีพร้อมกัน พอให้จบในเวลาที่ serverless จำกัด โดยไม่ยิง API รัวเกินไป
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let sign = queue.shift(); sign; sign = queue.shift()) {
        try {
          if (await findOne(kind, period.key, sign)) {
            results.skipped++;
          } else if (await ensureHoroscope(kind, sign, period)) {
            results.created++;
          } else {
            results.failed.push(sign);
          }
        } catch {
          results.failed.push(sign);
        }
      }
    })
  );
  return results;
}

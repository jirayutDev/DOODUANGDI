/**
 * Ephemeris helpers: real sky positions for grounding AI-written horoscopes.
 * Server-safe, pure TS, no network. Uses `astronomy-engine` (MIT licence).
 *
 * Ayanamsa (Lahiri / Chitrapaksha), standard linear approximation:
 *   ayanamsa(deg) = 23.853 + (yearFraction - 2000.0) * 50.29 / 3600
 * where 50.29 arcsec/yr is the general precession rate and 23.853 deg
 * (23 deg 51 min 11 sec) is the Lahiri value at 2000-01-01. Check: 2025.0 gives
 * 23.853 + 25 * 0.013969 = 24.202 deg (about 24 deg 12 min), matching published
 * Lahiri tables. Accuracy is a few arc-minutes, ample for sign-level astrology.
 *
 * Sidereal longitude = tropical longitude - ayanamsa. Signs are 12 equal 30 deg
 * segments from 0 deg Aries; Thai names come from ZODIAC_SIGN_NAMES (index 0 = เมษ).
 */
import * as Astronomy from "astronomy-engine";
import { ZODIAC_SIGN_NAMES } from "./astrology";

export const SKY_BODIES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
] as const;
export type SkyBody = (typeof SKY_BODIES)[number];

export const BODY_NAMES_TH: Record<SkyBody, string> = {
  Sun: "อาทิตย์",
  Moon: "จันทร์",
  Mercury: "พุธ",
  Venus: "ศุกร์",
  Mars: "อังคาร",
  Jupiter: "พฤหัสบดี",
  Saturn: "เสาร์",
};

export type BodyPosition = {
  tropicalLon: number;
  siderealLon: number;
  tropicalSign: string;
  siderealSign: string;
  /** index 0..11 of the sidereal sign (0 = เมษ) */
  siderealSignIndex: number;
  /** only meaningful for Mercury..Saturn; always false for Sun/Moon */
  retrograde: boolean;
};

export type MoonPhaseInfo = {
  /** Sun-Moon elongation, 0..360 (0 new, 180 full) */
  angle: number;
  /** illuminated fraction 0..1 */
  illumination: number;
  nameTh: "เดือนดับ" | "ข้างขึ้น" | "วันเพ็ญ" | "ข้างแรม";
};

export type Sky = {
  date: Date;
  ayanamsa: number;
  bodies: Record<SkyBody, BodyPosition>;
  moonPhase: MoonPhaseInfo;
};

export type Aspect = {
  a: SkyBody;
  b: SkyBody;
  type: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  angle: 0 | 60 | 90 | 120 | 180;
  orb: number;
};

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const DAY_MS = 86_400_000;
const THAI_OFFSET_MS = 7 * 3_600_000;

export function lahiriAyanamsa(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const yearFraction = year + (date.getTime() - start) / (end - start);
  return 23.853 + ((yearFraction - 2000.0) * 50.29) / 3600;
}

export function signIndex(lon: number): number {
  return Math.floor(norm360(lon) / 30) % 12;
}

/** Geocentric apparent tropical (of date) ecliptic longitude. */
export function tropicalLongitude(body: SkyBody, date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  if (body === "Moon") return Astronomy.EclipticGeoMoon(date).lon;
  const vec = Astronomy.GeoVector(body as Astronomy.Body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

function isRetrograde(body: SkyBody, date: Date): boolean {
  if (body === "Sun" || body === "Moon") return false;
  const h = DAY_MS / 2;
  const before = tropicalLongitude(body, new Date(date.getTime() - h));
  const after = tropicalLongitude(body, new Date(date.getTime() + h));
  let d = after - before;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d < 0;
}

function moonPhaseName(angle: number): MoonPhaseInfo["nameTh"] {
  if (angle < 12 || angle > 348) return "เดือนดับ";
  if (Math.abs(angle - 180) <= 12) return "วันเพ็ญ";
  return angle < 180 ? "ข้างขึ้น" : "ข้างแรม";
}

export function getSkyForDate(date: Date): Sky {
  const ayanamsa = lahiriAyanamsa(date);
  const bodies = {} as Record<SkyBody, BodyPosition>;
  for (const body of SKY_BODIES) {
    const tropicalLon = norm360(tropicalLongitude(body, date));
    const siderealLon = norm360(tropicalLon - ayanamsa);
    const siderealSignIndex = signIndex(siderealLon);
    bodies[body] = {
      tropicalLon,
      siderealLon,
      tropicalSign: ZODIAC_SIGN_NAMES[signIndex(tropicalLon)],
      siderealSign: ZODIAC_SIGN_NAMES[siderealSignIndex],
      siderealSignIndex,
      retrograde: isRetrograde(body, date),
    };
  }
  const angle = Astronomy.MoonPhase(date);
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
  return {
    date,
    ayanamsa,
    bodies,
    moonPhase: { angle, illumination, nameTh: moonPhaseName(angle) },
  };
}

const ASPECT_DEFS = [
  { type: "conjunction", angle: 0 },
  { type: "sextile", angle: 60 },
  { type: "square", angle: 90 },
  { type: "trine", angle: 120 },
  { type: "opposition", angle: 180 },
] as const;

/** Major aspects (tropical longitudes; separations are identical in both systems). Orb 6 deg, Moon 8 deg. */
export function getAspects(sky: Sky): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < SKY_BODIES.length; i++) {
    for (let j = i + 1; j < SKY_BODIES.length; j++) {
      const a = SKY_BODIES[i];
      const b = SKY_BODIES[j];
      let sep = Math.abs(sky.bodies[a].tropicalLon - sky.bodies[b].tropicalLon);
      if (sep > 180) sep = 360 - sep;
      const maxOrb = a === "Moon" || b === "Moon" ? 8 : 6;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= maxOrb) out.push({ a, b, type: def.type, angle: def.angle, orb });
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/* ---------------- Thai-time helpers & prompt summary ---------------- */

/** Noon Thai time (05:00 UTC) of the Thai calendar day containing `date`. */
export function thaiNoon(date: Date): Date {
  const t = new Date(date.getTime() + THAI_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 5));
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function thaiDateLabel(date: Date): string {
  const t = new Date(date.getTime() + THAI_OFFSET_MS);
  return `${t.getUTCDate()} ${TH_MONTHS[t.getUTCMonth()]}`;
}

const ASPECT_TH: Record<Aspect["type"], string> = {
  conjunction: "ร่วมมุม",
  sextile: "มุม 60°",
  square: "มุมฉาก 90°",
  trine: "ตรีโกณ 120°",
  opposition: "ตรงข้าม 180°",
};

function positionsLine(sky: Sky): string {
  const b = sky.bodies;
  return SKY_BODIES.map(
    (k) => `${BODY_NAMES_TH[k]}${b[k].siderealSign}${b[k].retrograde ? "(R)" : ""}`,
  ).join(" ");
}

function dayBlock(sky: Sky): string[] {
  const lines = [`ตำแหน่งดาว (ระบบนิรายนะ): ${positionsLine(sky)}`];
  const retro = SKY_BODIES.filter((k) => sky.bodies[k].retrograde).map((k) => BODY_NAMES_TH[k]);
  lines.push(retro.length ? `ดาวเดินถอยหลัง: ${retro.join(", ")}` : "ไม่มีดาวเดินถอยหลัง");
  const mp = sky.moonPhase;
  lines.push(`ดวงจันทร์: ${mp.nameTh} สว่าง ${Math.round(mp.illumination * 100)}%`);
  const asp = getAspects(sky)
    .slice(0, 5)
    .map((x) => `${BODY_NAMES_TH[x.a]}-${BODY_NAMES_TH[x.b]} ${ASPECT_TH[x.type]}`);
  if (asp.length) lines.push(`มุมสำคัญ: ${asp.join(", ")}`);
  return lines;
}

const INGRESS_BODIES: SkyBody[] = ["Sun", "Mercury", "Venus", "Mars"];

/** Notable events over `days` Thai days starting at the Thai day of `start`. */
function eventsOver(start: Date, days: number, opts: { moonSign: boolean; slowIngress: boolean }): string[] {
  const events: string[] = [];
  const base = thaiNoon(start).getTime();
  let prev = getSkyForDate(new Date(base));
  for (let i = 1; i < days; i++) {
    const cur = getSkyForDate(new Date(base + i * DAY_MS));
    const when = thaiDateLabel(cur.date);
    if (opts.moonSign && cur.bodies.Moon.siderealSign !== prev.bodies.Moon.siderealSign) {
      events.push(`${when} จันทร์เข้า${cur.bodies.Moon.siderealSign}`);
    }
    const ingress: SkyBody[] = opts.slowIngress ? [...INGRESS_BODIES, "Jupiter", "Saturn"] : INGRESS_BODIES;
    for (const k of ingress) {
      if (cur.bodies[k].siderealSign !== prev.bodies[k].siderealSign) {
        events.push(`${when} ${BODY_NAMES_TH[k]}เข้า${cur.bodies[k].siderealSign}`);
      }
    }
    for (const k of SKY_BODIES) {
      if (k === "Sun" || k === "Moon") continue;
      if (cur.bodies[k].retrograde !== prev.bodies[k].retrograde) {
        events.push(`${when} ${BODY_NAMES_TH[k]}${cur.bodies[k].retrograde ? "เริ่มถอยหลัง" : "กลับเดินหน้า"}`);
      }
    }
    prev = cur;
  }
  return events;
}

function moonPhaseDates(start: Date, days: number): string[] {
  const out: string[] = [];
  const from = new Date(thaiNoon(start).getTime() - 12 * 3_600_000); // Thai midnight
  const targets: [number, string][] = [
    [0, "เดือนดับ"],
    [180, "วันเพ็ญ"],
  ];
  for (const [lon, label] of targets) {
    const t = Astronomy.SearchMoonPhase(lon, from, days);
    if (t) out.push(`${label} ${thaiDateLabel(t.date)}`);
  }
  return out;
}

/**
 * Compact Thai plain-text sky summary (<= ~900 chars) for use in an AI prompt.
 * - daily: positions on that Thai day (noon Thai time)
 * - weekly: `date` is the first day of the 7-day window; adds changes during it
 * - monthly: positions at the start of the Thai month containing `date`, plus the month's events
 */
export function summarizeSkyForPrompt(date: Date, kind: "daily" | "weekly" | "monthly"): string {
  let lines: string[];
  if (kind === "daily") {
    lines = dayBlock(getSkyForDate(thaiNoon(date)));
  } else if (kind === "weekly") {
    const start = thaiNoon(date);
    lines = dayBlock(getSkyForDate(start));
    const ev = eventsOver(start, 7, { moonSign: true, slowIngress: false });
    const ph = moonPhaseDates(start, 7);
    lines.push(`ช่วง 7 วัน (เริ่ม ${thaiDateLabel(start)}): ${[...ev, ...ph].join(", ") || "ไม่มีการเปลี่ยนแปลงสำคัญ"}`);
  } else {
    const t = new Date(date.getTime() + THAI_OFFSET_MS);
    const y = t.getUTCFullYear();
    const m = t.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 5));
    const days = Math.round((Date.UTC(y, m + 1, 1) - Date.UTC(y, m, 1)) / DAY_MS);
    const sky = getSkyForDate(start);
    lines = [
      `ต้นเดือน ${thaiDateLabel(start)} (นิรายนะ): ${positionsLine(sky)}`,
      `อาทิตย์อยู่ราศี${sky.bodies.Sun.siderealSign}`,
    ];
    const ev = eventsOver(start, days, { moonSign: false, slowIngress: true });
    const ph = moonPhaseDates(start, days);
    lines.push(`เหตุการณ์ในเดือน: ${[...ev, ...ph].join(", ") || "ไม่มี"}`);
  }
  const text = lines.join("\n");
  return text.length > 900 ? text.slice(0, 897) + "..." : text;
}

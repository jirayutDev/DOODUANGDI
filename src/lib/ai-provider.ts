// ผู้ให้บริการ AI (API แบบเดียวกับ OpenAI: POST {baseUrl}/chat/completions) ตั้งผ่าน env เปลี่ยนเจ้าได้โดยไม่แก้โค้ด
//   AI_BASE_URL / AI_API_KEY            = สายหลัก (แชท ดวง จับคู่ ฯลฯ) ไม่ตั้ง = ใช้ OpenRouter ด้วย OPENROUTER_API_KEY
//   AI_MODEL / AI_FALLBACK_MODELS       = โมเดลหลัก/สำรอง (คั่นจุลภาค) ใช้ชื่อ OPENROUTER_MODEL / OPENROUTER_FALLBACK_MODELS แทนได้
//   AI_VISION_BASE_URL / AI_VISION_API_KEY = สายอ่านรูปใบหน้า (โหงวเฮ้ง) แยกจากสายหลักได้ ไม่ตั้ง = ใช้เจ้าเดียวกับสายหลัก (ถ้ามีคีย์) ไม่งั้นใช้ OpenRouter
//   AI_BACKUP_BASE_URL / AI_BACKUP_API_KEY / AI_BACKUP_MODEL = สายสำรอง (เจ้า/pool ที่ 2) ใช้อัตโนมัติเมื่อสายหลักล่ม ดูรายละเอียดด้านล่าง
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface AiProvider {
  baseUrl: string;
  apiKey: string | undefined;
}

const trim = (u: string) => u.trim().replace(/\/+$/, "");

export function mainProvider(): AiProvider {
  const baseUrl = trim(process.env.AI_BASE_URL || OPENROUTER_BASE_URL);
  return { baseUrl, apiKey: process.env.AI_API_KEY || (baseUrl === OPENROUTER_BASE_URL ? process.env.OPENROUTER_API_KEY : undefined) };
}

export function visionProvider(): AiProvider {
  if (process.env.AI_VISION_BASE_URL) {
    return { baseUrl: trim(process.env.AI_VISION_BASE_URL), apiKey: process.env.AI_VISION_API_KEY };
  }
  // ตามสายหลัก (เช่น MaxPlus) ถ้ามีคีย์ ไม่มีคีย์สายหลักค่อยถอยไป OpenRouter
  const main = mainProvider();
  if (main.apiKey) return main;
  return { baseUrl: OPENROUTER_BASE_URL, apiKey: process.env.OPENROUTER_API_KEY };
}

export function isOpenRouter(p: AiProvider): boolean {
  return p.baseUrl === OPENROUTER_BASE_URL;
}

// ชื่อโมเดลต่างกันตามเจ้า: OpenRouter ใช้ "anthropic/claude-haiku-4.5" ส่วนเจ้าอื่นมักใช้ชื่อสั้น เช่น "claude-haiku-4-5-20251001"
export function defaultModel(p: AiProvider): string {
  return isOpenRouter(p) ? "anthropic/claude-haiku-4.5" : "claude-haiku-4-5-20251001";
}

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

export function modelChain(): string[] {
  const p = mainProvider();
  const primary = process.env.AI_MODEL || process.env.OPENROUTER_MODEL || defaultModel(p);
  const fallbacks = list(process.env.AI_FALLBACK_MODELS ?? process.env.OPENROUTER_FALLBACK_MODELS);
  return [primary, ...fallbacks];
}

// สายอ่านรูป: AI_VISION_MODEL / AI_VISION_FALLBACK_MODELS (ใช้ชื่อ OPENROUTER_VISION_* แทนได้) ไม่ตั้ง = ค่าเริ่มต้นตามเจ้าที่ใช้
// OpenRouter: haiku 4.5 + gemini 2.5 flash สำรอง ส่วนเจ้าอื่นใช้โมเดลเริ่มต้นของเจ้านั้นและไม่มีตัวสำรอง (ชื่อโมเดลของ OpenRouter ใช้กับเจ้าอื่นไม่ได้)
export function visionModelChain(): string[] {
  const p = visionProvider();
  const primary = process.env.AI_VISION_MODEL || process.env.OPENROUTER_VISION_MODEL || defaultModel(p);
  const fallbackDefault = isOpenRouter(p) ? "google/gemini-2.5-flash" : "";
  const fallbacks = list(process.env.AI_VISION_FALLBACK_MODELS ?? process.env.OPENROUTER_VISION_FALLBACK_MODELS ?? fallbackDefault);
  return [primary, ...fallbacks];
}

// ---------- สายสำรอง (pool/เจ้าที่ 2) ----------
//   AI_BACKUP_BASE_URL / AI_BACKUP_API_KEY            = สายสำรอง (ต้องตั้งทั้งคู่ถึงเปิดใช้) ใช้เมื่อสายหลักล่ม/ล้มทุกโมเดล
//   AI_BACKUP_MODEL / AI_BACKUP_FALLBACK_MODELS       = โมเดลของสายสำรอง (ชื่อโมเดลของแต่ละเจ้าไม่เหมือนกัน ไม่ตั้ง = ค่าเริ่มต้นตามเจ้านั้น)
//   AI_BACKUP_VISION_MODEL                            = โมเดลอ่านรูปของสายสำรอง ไม่ตั้ง = ใช้โมเดลสายสำรองเดียวกับข้อความ
export interface AiLane {
  provider: AiProvider;
  models: string[];
}

export function backupProvider(): AiProvider | null {
  const baseUrl = process.env.AI_BACKUP_BASE_URL;
  const apiKey = process.env.AI_BACKUP_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: trim(baseUrl), apiKey };
}

function backupModels(p: AiProvider): string[] {
  return [process.env.AI_BACKUP_MODEL || defaultModel(p), ...list(process.env.AI_BACKUP_FALLBACK_MODELS)];
}

// สายที่เป็นเจ้าเดียวกัน (baseUrl + key เหมือนกัน) ไม่นับเป็นสายสำรอง
const sameLane = (a: AiProvider, b: AiProvider) => a.baseUrl === b.baseUrl && a.apiKey === b.apiKey;

// ลำดับสายสำหรับงานข้อความ: สายหลัก แล้วตามด้วยสายสำรอง (ถ้าตั้ง) สายที่เพิ่งล่มจะถูกย้ายไปท้ายลำดับชั่วคราว
export function textLanes(): AiLane[] {
  const main = mainProvider();
  const lanes: AiLane[] = main.apiKey ? [{ provider: main, models: modelChain() }] : [];
  const backup = backupProvider();
  if (backup && !sameLane(backup, main)) lanes.push({ provider: backup, models: backupModels(backup) });
  return orderByHealth(lanes);
}

// สายอ่านรูป: สายอ่านรูปหลัก แล้วสายสำรอง (ใช้โมเดลที่อ่านรูปได้ของสายสำรอง)
export function visionLanes(): AiLane[] {
  const main = visionProvider();
  const lanes: AiLane[] = main.apiKey ? [{ provider: main, models: visionModelChain() }] : [];
  const backup = backupProvider();
  if (backup && !sameLane(backup, main)) {
    const models = process.env.AI_BACKUP_VISION_MODEL ? [process.env.AI_BACKUP_VISION_MODEL] : backupModels(backup);
    lanes.push({ provider: backup, models });
  }
  return orderByHealth(lanes);
}

// เบรกเกอร์ต่อสาย: สายที่เพิ่งตอบ 5xx/401/402/403 หรือต่อไม่ติดจะถูกพักไว้ชั่วคราว คำขอถัดไปไม่ต้องเสียเวลารอสายที่ล่มซ้ำ (อยู่ในหน่วยความจำของ instance)
const LANE_DOWN_MS = 60_000;
const laneDownUntil = new Map<string, number>();

export function markLaneDown(p: AiProvider): void {
  laneDownUntil.set(p.baseUrl, Date.now() + LANE_DOWN_MS);
}

export function markLaneUp(p: AiProvider): void {
  laneDownUntil.delete(p.baseUrl);
}

function isLaneDown(p: AiProvider): boolean {
  const until = laneDownUntil.get(p.baseUrl);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    laneDownUntil.delete(p.baseUrl);
    return false;
  }
  return true;
}

// สายที่ไม่ล่มมาก่อน (เรียงเดิม) สายที่พักอยู่ไปท้าย แต่ไม่ตัดทิ้ง เผื่อสายอื่นก็พังด้วย
function orderByHealth(lanes: AiLane[]): AiLane[] {
  return [...lanes.filter((l) => !isLaneDown(l.provider)), ...lanes.filter((l) => isLaneDown(l.provider))];
}

function hostName(p: AiProvider): string {
  try {
    return new URL(p.baseUrl).host;
  } catch {
    return p.baseUrl;
  }
}

// สถานะการตั้งค่า (ไม่มีค่าลับ) ใช้ใน /api/health และข้อความแนะนำของหน้าแอดมิน
export function aiStatus() {
  const p = mainProvider();
  const backup = backupProvider();
  return {
    provider: hostName(p),
    keyConfigured: !!p.apiKey,
    models: modelChain(),
    backup: backup ? { provider: hostName(backup), models: backupModels(backup) } : null,
  };
}

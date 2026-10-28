// ผู้ให้บริการ AI (API แบบเดียวกับ OpenAI: POST {baseUrl}/chat/completions) ตั้งผ่าน env เปลี่ยนเจ้าได้โดยไม่แก้โค้ด
//   AI_BASE_URL / AI_API_KEY            = สายหลัก (แชท ดวง จับคู่ ฯลฯ) ไม่ตั้ง = ใช้ OpenRouter ด้วย OPENROUTER_API_KEY
//   AI_MODEL / AI_FALLBACK_MODELS       = โมเดลหลัก/สำรอง (คั่นจุลภาค) ใช้ชื่อ OPENROUTER_MODEL / OPENROUTER_FALLBACK_MODELS แทนได้
//   AI_VISION_BASE_URL / AI_VISION_API_KEY = สายอ่านรูปใบหน้า (โหงวเฮ้ง) แยกจากสายหลักได้ ไม่ตั้ง = ใช้เจ้าเดียวกับสายหลัก (ถ้ามีคีย์) ไม่งั้นใช้ OpenRouter
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

// สถานะการตั้งค่า (ไม่มีค่าลับ) ใช้ใน /api/health และข้อความแนะนำของหน้าแอดมิน
export function aiStatus() {
  const p = mainProvider();
  let host = p.baseUrl;
  try {
    host = new URL(p.baseUrl).host;
  } catch {
    // ปล่อยตามที่ตั้งมา
  }
  return { provider: host, keyConfigured: !!p.apiKey, models: modelChain() };
}

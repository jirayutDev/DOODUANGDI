import type { BirthProfile } from "./astrology";
import type { TarotCard } from "./tarot-data";

// คำที่บ่งชี้ว่าผู้ใช้อาจทุกข์ใจหนัก — ตามขอบเขต AI ในแผน ต้องส่งต่อสายด่วนสุขภาพจิต ไม่ใช่ทำนายต่อ
const CRISIS_KEYWORDS = ["ฆ่าตัวตาย", "อยากตาย", "ทำร้ายตัวเอง", "ไม่อยากมีชีวิตอยู่"];

export function isCrisisMessage(message: string): boolean {
  return CRISIS_KEYWORDS.some((k) => message.includes(k));
}

export const CRISIS_REPLY =
  "น้องมูเป็นห่วงเลยนะ เรื่องนี้สำคัญกว่าดวงมาก อยากให้ลองคุยกับคนที่ช่วยได้จริงๆ ก่อน โทรสายด่วนสุขภาพจิต 1323 (ฟรี ตลอด 24 ชั่วโมง) หรือคุยกับคนที่คุณไว้ใจอยู่ข้างๆ ก็ได้นะ";

const BASE_SYSTEM_PROMPT = [
  "คุณคือ 'น้องมู' หนูมูสิกะ ผู้ช่วยตัวน้อยของพระพิฆเนศในเว็บดูดวง 'ดูดวงดิ' (DOODUANGD)",
  "พูดสุภาพ อบอุ่น เป็นกันเอง ใช้ภาษาไทยล้วนเท่านั้น ห้ามปนภาษาอื่นแทรกมาเด็ดขาด (เช่น ภาษาจีน อังกฤษ) ยกเว้นชื่อเฉพาะที่จำเป็น",
  "ห้ามทำนายเรื่องความตายหรือความเจ็บป่วย ห้ามทำนายหวย ห้ามขู่ผู้ใช้ ห้ามให้คำแนะนำทางการแพทย์ กฎหมาย หรือการลงทุน",
].join("\n");

function getModelChain(): string[] {
  const primary = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [primary, ...fallbacks];
}

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(model: string, messages: ChatMsg[], maxTokens: number): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "http-referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      // header ต้องเป็น ASCII เท่านั้น (fetch จะ throw ถ้ามีอักษรไทย) ใช้ "DOODUANGD" แทนชื่อแบรนด์ไทย
      "x-title": "DOODUANGD",
    },
    body: JSON.stringify({
      model,
      // free models หลายตัวเป็น reasoning model ที่ใช้ token คิดก่อนตอบ
      // ให้ budget น้อยไปจะโดนตัดตอนคิด (finish_reason: length, content: null/ประโยคขาดกลางคัน)
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API error (${model}): ${res.status}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(`Empty response from OpenRouter (${model})`);
  }
  // ตอบไม่ครบเพราะ token หมดกลางคัน — ถือว่าใช้ไม่ได้ ให้ไปลองโมเดลถัดไปหรือ fallback แทนที่จะโชว์ประโยคขาดๆ
  if (choice?.finish_reason === "length") {
    throw new Error(`Truncated response from OpenRouter (${model})`);
  }
  // โมเดล free บางตัวหลุดปนอักษรจีน/ญี่ปุ่น/เกาหลีมาเป็นครั้งคราวแม้สั่งห้ามแล้วในพรอมต์
  // เช็กซ้ำเป็นเซฟการ์ดอีกชั้น ไม่ปล่อยให้หลุดถึงผู้ใช้ ให้ไปลองโมเดลถัดไปแทน
  const CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿가-힯]/;
  if (CJK_PATTERN.test(text)) {
    throw new Error(`Response contains non-Thai CJK characters (${model})`);
  }
  return text.trim();
}

// ไล่ตาม OPENROUTER_MODEL ก่อน แล้วค่อยลอง OPENROUTER_FALLBACK_MODELS ทีละตัวถ้าตัวหลักพังหรือโดน rate limit
// คืนค่า null เมื่อไม่มี API key หรือทุกโมเดลในสายพังหมด ให้ผู้เรียกไป fallback เป็น rule-based เอง
async function chatViaOpenRouter(messages: ChatMsg[], maxTokens = 700): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  for (const model of getModelChain()) {
    try {
      return await callOpenRouter(model, messages, maxTokens);
    } catch {
      // ลองโมเดลถัดไปในสาย
    }
  }
  return null;
}

// ---------- แชท 1 คำถาม 1 คำตอบ ----------
interface MuAiInput {
  message: string;
  profile?: (BirthProfile & { birthDate: string }) | null;
  card: TarotCard;
  history: { role: "user" | "assistant"; content: string }[];
}

function profileLine(profile: MuAiInput["profile"]): string {
  return profile
    ? `ผู้ถามเกิดวัน${profile.thaiBirthDay} ราศี${profile.zodiacSign} ปีนักษัตร${profile.chineseZodiac} สีมงคล${profile.luckyColor} เลขศาสตร์ ${profile.lifePathNumber}`
    : "ผู้ถามยังไม่ได้กรอกวันเกิด ให้ชวนไปกรอกที่หน้าดวงโปรไฟล์อย่างนุ่มนวล";
}

export async function generateMuReply(input: MuAiInput): Promise<string> {
  const system = [
    BASE_SYSTEM_PROMPT,
    "ตอบสั้นกระชับ 2-4 ประโยค",
    profileLine(input.profile),
    "จบด้วยการชวนคุยต่อ หรือแนะนำว่าถ้าอยากได้คำตอบลึกกว่านี้ให้ปรึกษาหมอดูตัวจริงในระบบ",
  ].join("\n");

  const reply = await chatViaOpenRouter([
    { role: "system", content: system },
    ...input.history.slice(-6),
    {
      role: "user",
      content: `วันนี้เปิดไพ่ "${input.card.nameTh} (${input.card.nameEn})" ความหมาย: ${input.card.uprightMeaning}\n\nคำถาม: ${input.message}`,
    },
  ]);

  return reply ?? buildFallbackReply(input);
}

function buildFallbackReply({ message, profile, card }: MuAiInput): string {
  const greeting = profile
    ? `จากดวงราศี${profile.zodiacSign}ของคุณ`
    : "ยังไม่รู้ดวงเกิดของคุณเลย (ลองไปกรอกที่หน้าดวงโปรไฟล์นะ)";

  return [
    `${greeting} วันนี้น้องมูเปิดไพ่ "${card.nameTh}" ให้ — ${card.uprightMeaning}`,
    `เรื่อง "${message.slice(0, 60)}" ลองใจเย็นๆ ดูสัญญาณรอบตัวไปพร้อมกันนะ`,
    "ถ้าอยากได้คำตอบที่ลึกและตรงจุดกว่านี้ ลองคุยกับหมอดูตัวจริงในระบบดูได้เลย",
  ].join(" ");
}

// ---------- สรุปผลไพ่ทั้งกระดาน (หลังเปิดไพ่แบบวางเป็นชุด) ----------
export interface SpreadCardResult {
  position: string;
  card: TarotCard;
  reversed: boolean;
}

interface SpreadSummaryInput {
  spreadName: string;
  question?: string;
  results: SpreadCardResult[];
}

function formatSpreadForPrompt({ spreadName, question, results }: SpreadSummaryInput): string {
  const cardLines = results
    .map((r, i) => {
      const orientation = r.reversed ? "กลับหัว" : "ตั้งตรง";
      const meaning = r.reversed ? r.card.reversedMeaning : r.card.uprightMeaning;
      return `${i + 1}. ตำแหน่ง "${r.position}" — ไพ่ ${r.card.nameTh} (${r.card.nameEn}) [${orientation}]: ${meaning}`;
    })
    .join("\n");

  const questionLine = question
    ? `คำถามที่ผู้ถามอยากรู้: "${question}" — ให้แปลผลไพ่ทุกใบโดยโฟกัสตอบคำถามนี้เป็นหลัก`
    : "ผู้ถามไม่ได้ระบุคำถามเฉพาะเจาะจง ให้สรุปภาพรวมของสถานการณ์ปัจจุบัน";

  return `รูปแบบการวางไพ่: ${spreadName}\n\n${cardLines}\n\n${questionLine}`;
}

export async function generateSpreadSummary(input: SpreadSummaryInput): Promise<string> {
  const system = [
    BASE_SYSTEM_PROMPT,
    "หน้าที่ของคุณตอนนี้คือสรุปไพ่ทั้งชุดที่เปิดออกมาให้เป็นเรื่องราวเดียวกัน ไม่ใช่อธิบายทีละใบแยกกันยาวๆ",
    "เชื่อมโยงความหมายของแต่ละตำแหน่งเข้าด้วยกันให้เห็นภาพรวม เช่น อดีตนำมาสู่ปัจจุบันอย่างไร แล้วส่งผลต่ออนาคตอย่างไร",
    "สำคัญมาก: ไม่ว่าไพ่จะมีกี่ใบ (แม้จะเป็นเซลติกครอส 10 ใบ) ให้ตอบสั้นกระชับไม่เกิน 8 ประโยครวมทั้งหมด ห้ามอธิบายทีละตำแหน่งแบบแยกย่อหน้า ให้เกลาเป็นเรื่องเดียวสั้นๆ แทน",
    "ต้องเขียนให้จบประโยคสมบูรณ์เสมอ ห้ามตัดจบกลางประโยค ถ้าเนื้อหาจะยาวเกินให้ตัดตอนจบให้กระชับขึ้นแทนที่จะพูดถึงทุกตำแหน่งครบ",
    "จบด้วยคำแนะนำสั้นๆ หรือชวนไปคุยกับหมอดูตัวจริงถ้าอยากได้คำตอบลึกกว่านี้",
  ].join("\n");

  const summary = await chatViaOpenRouter(
    [
      { role: "system", content: system },
      { role: "user", content: formatSpreadForPrompt(input) },
    ],
    1400
  );

  return summary ?? buildFallbackSpreadSummary(input);
}

function buildFallbackSpreadSummary({ question, results }: SpreadSummaryInput): string {
  const opening = question
    ? `เรื่อง "${question}" ไพ่ที่เปิดมาบอกเล่าไว้แบบนี้`
    : "ภาพรวมจากไพ่ที่เปิดมาในรอบนี้";

  const lines = results.map((r) => {
    const orientation = r.reversed ? " (กลับหัว)" : "";
    const meaning = r.reversed ? r.card.reversedMeaning : r.card.uprightMeaning;
    return `• ${r.position}: ${r.card.nameTh}${orientation} — ${meaning}`;
  });

  return [
    `${opening}:`,
    ...lines,
    "ลองเอาแต่ละตำแหน่งมาต่อกันเป็นเส้นเรื่องเดียวดูนะ ถ้าอยากได้คำตอบที่ลึกและตรงจุดกว่านี้ ลองคุยกับหมอดูตัวจริงในระบบได้เลย",
  ].join("\n");
}

// ---------- ดูดวงรายวันจากวันเกิด (เลือกแค่วันในสัปดาห์ ไม่ต้องกรอกวันที่เต็ม) ----------
export async function generateDayHoroscope(dayName: string, luckyColor: string): Promise<string> {
  const system = [
    BASE_SYSTEM_PROMPT,
    "งานตอนนี้: ทำนายดวงรายวันแบบสั้นๆ สำหรับคนเกิดวันที่ระบุ ไม่ใช่ทำนายเหตุการณ์เจาะจง แต่ให้เป็นพลังงาน/โทนของวันนี้",
    "ตอบ 2-3 ประโยค พูดถึงพลังงานวันนี้ + คำแนะนำสั้นๆ ประกอบสีมงคลของวัน",
    "ห้ามระบุตัวเลขนำโชคหรือเลขเสี่ยงโชคใดๆ (ไม่ทำนายหวย)",
  ].join("\n");

  const reply = await chatViaOpenRouter([
    { role: "system", content: system },
    { role: "user", content: `คนเกิดวัน${dayName} สีมงคลประจำวันคือ${luckyColor} วันนี้ดวงเป็นอย่างไรบ้าง` },
  ]);

  return (
    reply ??
    `คนเกิดวัน${dayName} วันนี้ใส่ใจเรื่อง${luckyColor}เป็นพิเศษนะ พลังงานวันนี้เอื้อให้ใจเย็นและมีสติ ลองทำเรื่องที่ค้างคาให้สำเร็จไปทีละอย่าง`
  );
}

// ---------- ดวงเฉพาะเรื่อง/เฉพาะช่วงเวลา (ใช้ร่วมกันได้หลายหัวข้อใน /duang/[slug]) ----------
interface TopicReadingInput {
  topicName: string; // เช่น "ดวงการงาน", "ดวงรายสัปดาห์"
  timeframe: string; // เช่น "สัปดาห์นี้", "เดือนนี้", "ปี 2569"
  profile?: (BirthProfile & { birthDate: string }) | null;
  partnerZodiac?: string; // ใช้เฉพาะหัวข้อดวงสมพงศ์
  extraRule?: string; // กฎเฉพาะหัวข้อ เช่น ห้ามพูดเรื่องเลขสำหรับโชคลาภ
}

export async function generateTopicReading(input: TopicReadingInput): Promise<string> {
  const system = [
    BASE_SYSTEM_PROMPT,
    `งานตอนนี้: ทำนาย "${input.topicName}" ช่วง${input.timeframe} ให้ผู้ถาม`,
    "ตอบ 3-5 ประโยค กระชับ อ่านง่าย ไม่วกวน จบประโยคให้สมบูรณ์เสมอ",
    input.profile
      ? `ข้อมูลผู้ถาม: เกิดวัน${input.profile.thaiBirthDay} ราศี${input.profile.zodiacSign} ปีนักษัตร${input.profile.chineseZodiac} สีมงคล${input.profile.luckyColor}`
      : "ผู้ถามไม่ได้กรอกวันเกิด ให้ทำนายแบบภาพรวมทั่วไป และชวนไปกรอกวันเกิดที่หน้าดวงโปรไฟล์เพื่อความแม่นยำขึ้น",
    input.partnerZodiac ? `ราศีของอีกฝ่ายคือ${input.partnerZodiac}` : "",
    input.extraRule ?? "",
    "จบด้วยคำแนะนำสั้นๆ หรือชวนคุยกับหมอดูตัวจริงถ้าอยากรู้ลึกกว่านี้",
  ]
    .filter(Boolean)
    .join("\n");

  const reply = await chatViaOpenRouter([
    { role: "system", content: system },
    { role: "user", content: `ขอดู${input.topicName}${input.timeframe}หน่อย` },
  ]);

  return (
    reply ??
    `${input.topicName}${input.timeframe}ของคุณอยู่ในเกณฑ์ปกติดี ใจเย็นๆ ค่อยๆ ทำไปทีละขั้น ถ้าอยากรู้ลึกกว่านี้ลองคุยกับหมอดูตัวจริงในระบบดูนะ`
  );
}

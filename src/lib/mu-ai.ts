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

// content เป็น array ได้เมื่อต้องแนบรูป (ใช้กับฟีเจอร์สแกนหน้าดูโหงวเฮ้ง)
type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
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

// ---------- สแกนหน้าดูโหงวเฮ้ง (ต้องใช้โมเดลที่อ่านรูปได้) ----------
// แยกสายโมเดลจากแชทปกติ เพราะ free models ส่วนใหญ่อ่านรูปไม่ได้
function getVisionModelChain(): string[] {
  const primary = process.env.OPENROUTER_VISION_MODEL || "anthropic/claude-haiku-4.5";
  const fallbacks = (process.env.OPENROUTER_VISION_FALLBACK_MODELS ?? "google/gemini-2.5-flash")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [primary, ...fallbacks];
}

// แท็บที่หน้าผลลัพธ์ (ตามดีไซน์: ใบหน้า / ตา / ปาก / คิ้ว)
export const FACE_PARTS = [
  { key: "face", label: "ใบหน้า", meaning: "รูปหน้าตามธาตุ รวมหน้าผาก จมูก โหนกแก้ม คาง — นิสัยและดวงภาพรวม" },
  { key: "eyes", label: "ตา", meaning: "ความรัก ความคิด จิตใจ" },
  { key: "mouth", label: "ปาก", meaning: "วาจา เสน่ห์ บริวาร" },
  { key: "eyebrows", label: "คิ้ว", meaning: "พี่น้อง มิตรสหาย ชื่อเสียง" },
] as const;

export type FacePartKey = (typeof FACE_PARTS)[number]["key"];

export const FACE_ELEMENTS = ["ไม้", "ไฟ", "ดิน", "ทอง", "น้ำ"] as const;

export interface FaceReadingResult {
  element: string; // ธาตุของใบหน้า เช่น "ไฟ"
  parts: { key: FacePartKey; label: string; reading: string }[];
  advice: string;
}

export type FaceReadingOutcome =
  | { ok: true; result: FaceReadingResult }
  | { ok: false; reason: "no_face" | "unavailable" };

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeFaceReading(raw: unknown): FaceReadingOutcome | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.noFace === true) return { ok: false, reason: "no_face" };

  const parts = (r.parts ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const element = str(r.element).replace(/^ธาตุ/, "");
  const result: FaceReadingResult = {
    element: (FACE_ELEMENTS as readonly string[]).includes(element) ? element : "",
    parts: FACE_PARTS.map((p) => ({ key: p.key, label: p.label, reading: str(parts[p.key]) })),
    advice: str(r.advice),
  };
  // ต้องครบทุกแท็บถึงถือว่าใช้ได้ ไม่งั้นลองโมเดลถัดไป
  if (result.parts.some((p) => !p.reading)) return null;
  return { ok: true, result };
}

export async function generateFaceReading(imageDataUrl: string): Promise<FaceReadingOutcome> {
  if (!process.env.OPENROUTER_API_KEY) return { ok: false, reason: "unavailable" };

  const partSpec = FACE_PARTS.map((p) => `"${p.key}": ${p.label} (${p.meaning})`).join(", ");
  const system = [
    BASE_SYSTEM_PROMPT,
    "งานตอนนี้: ดูโหงวเฮ้ง (นรลักษณ์ศาสตร์แบบจีน) จากรูปใบหน้าที่ผู้ใช้ส่งมา เพื่อความบันเทิงและเป็นกำลังใจ",
    "ให้ดูเฉพาะรูปทรงและลักษณะส่วนต่างๆ ของใบหน้าตามตำราโหงวเฮ้ง แล้วตีความในเชิงบวก สร้างสรรค์ และให้กำลังใจ",
    "ห้ามวิจารณ์ความสวยความหล่อ ห้ามพูดถึงน้ำหนัก สีผิว เชื้อชาติ อายุ เพศ หรือสุขภาพ ห้ามเดาตัวตนว่าเป็นใคร",
    "ถ้าลักษณะไหนตามตำราถือว่าไม่ค่อยดี ให้พูดแบบนุ่มนวลเป็นข้อควรระวังพร้อมวิธีเสริม ไม่ใช่คำขู่",
    "ถ้าในรูปไม่มีใบหน้าคนชัดเจน มีหลายคน หรือเป็นรูปการ์ตูน/รูปวาด ให้ตอบ {\"noFace\": true} เท่านั้น",
    "ตอบกลับเป็น JSON อย่างเดียว ห้ามมีข้อความอื่นนอก JSON ตามรูปแบบนี้:",
    `{"element": "ธาตุของรูปหน้า เลือก 1 คำจาก ${FACE_ELEMENTS.join("/")}", "parts": {${partSpec}}, "advice": "คำแนะนำเสริมดวง 1-2 ประโยค"}`,
    "ช่อง face ให้อธิบายโครงหน้าตามธาตุนั้นและนิสัย/ดวงภาพรวม 3-5 ประโยค ช่องอื่นช่องละ 2-3 ประโยค อธิบายลักษณะที่เห็นก่อนแล้วตามด้วยคำทำนาย",
    "ทุกข้อความใน JSON ต้องเป็นภาษาไทยล้วน จบประโยคสมบูรณ์",
  ].join("\n");

  const messages: ChatMsg[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "text", text: "ช่วยดูโหงวเฮ้งจากใบหน้าในรูปนี้ให้หน่อย" },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  for (const model of getVisionModelChain()) {
    try {
      const text = await callOpenRouter(model, messages, 1600);
      const outcome = normalizeFaceReading(extractJson(text));
      if (outcome) return outcome;
    } catch {
      // ลองโมเดลถัดไปในสาย
    }
  }
  return { ok: false, reason: "unavailable" };
}

import { createHmac, timingSafeEqual } from "node:crypto";

// ตรวจลายเซ็นของ Supabase Auth Hook (มาตรฐาน Standard Webhooks)
// secret ที่ Supabase ให้มีรูปแบบ "v1,whsec_<base64>" ลายเซ็นคือ HMAC-SHA256 ของ "<webhook-id>.<webhook-timestamp>.<body>"
const TOLERANCE_SECONDS = 5 * 60;

export function verifyHookSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;

  const keyPart = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  const key = Buffer.from(keyPart, "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  // header อาจมีหลายลายเซ็นคั่นด้วยช่องว่าง (เช่น "v1,xxx v1,yyy") ผ่านถ้าตรงอย่างน้อยหนึ่งอัน
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

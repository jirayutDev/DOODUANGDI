import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

// ล็อกอินแอดมินแยกจากผู้ใช้ทั่วไป: username + password เดียว เก็บใน env
// env: ADMIN_USERNAME, ADMIN_PASSWORD_HASH (สร้างด้วย `npm run admin:setup`), ADMIN_SESSION_SECRET (ยาว >= 32 ตัวอักษร)
export const ADMIN_COOKIE = "adm_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

export function isAdminAuthConfigured(): boolean {
  return !!process.env.ADMIN_USERNAME && /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(process.env.ADMIN_PASSWORD_HASH ?? "") && !!secret();
}

export function hashPassword(password: string, saltHex: string): string {
  return scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// คำนวณ hash ทุกครั้งแม้ username ผิด เพื่อไม่ให้เวลาตอบสนองบอกได้ว่า username ถูก
export function verifyAdminCredentials(username: string, password: string): boolean {
  if (!isAdminAuthConfigured()) return false;
  const [salt, expected] = process.env.ADMIN_PASSWORD_HASH!.split(":");
  const userOk = safeEqual(username, process.env.ADMIN_USERNAME!);
  const passOk = safeEqual(hashPassword(password, salt), expected);
  return userOk && passOk;
}

function sign(exp: number): string {
  return createHmac("sha256", secret()!).update(`admin:${exp}`).digest("hex");
}

export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  return `${exp}.${sign(exp)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, sign(exp));
}

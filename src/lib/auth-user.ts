import type { User } from "@supabase/supabase-js";

// ผู้ใช้ที่ล็อกอินด้วยเบอร์โทรหรือ LINE อาจไม่มีอีเมล จึงห้ามใช้ user.email เป็นตัวตัดสินสถานะล็อกอิน
export function displayName(user: User): string {
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  return user.email || meta.full_name || meta.name || user.phone || "ผู้ใช้";
}

export function avatarInitial(user: User): string {
  return displayName(user).replace(/^\+/, "").charAt(0).toUpperCase() || "?";
}

// แปล error ของ Supabase Auth เป็นภาษาไทย (ข้อความที่ไม่รู้จักจะไม่โชว์อังกฤษดิบ)
export function mapAuthError(err: unknown, fallback = "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้งนะ"): string {
  const e = err as { message?: string; code?: string; status?: number } | null;
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "ยังไม่ได้ยืนยันอีเมล เช็กกล่องจดหมายแล้วกดลิงก์ยืนยันก่อนนะ";
  }
  if (code === "user_already_exists" || msg.includes("already registered")) {
    return "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนนะ";
  }
  if (code === "weak_password" || msg.includes("password should be")) {
    return "รหัสผ่านไม่ปลอดภัยพอ ลองใช้ให้ยาวและเดายากขึ้น";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || e?.status === 429) {
    return "ขอบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ";
  }
  if (code === "otp_expired" || msg.includes("expired")) {
    return "ลิงก์หรือรหัสหมดอายุแล้ว ขอใหม่อีกครั้งนะ";
  }
  if (code === "otp_disabled" || msg.includes("signups not allowed")) {
    return "ไม่พบบัญชีอีเมลนี้ ลองสมัครสมาชิกก่อนนะ";
  }
  if (code === "validation_failed" || msg.includes("unable to validate email")) {
    return "รูปแบบอีเมลไม่ถูกต้อง";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ";
  }
  return fallback;
}

// สร้างลิงก์ Google Meet ผ่าน Google Calendar API (events.insert + conferenceData) ด้วยบัญชี Google ของเว็บ
// env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (refresh token ของบัญชีเจ้าของเว็บ ขอสิทธิ์ calendar.events)
// ห้องที่สร้างอยู่ในปฏิทินของบัญชีนั้น ถ้าสร้างไม่สำเร็จ การจองยังอยู่ หมอดูวางลิงก์ Meet เองได้ที่หน้าหมอดู
const TIMEOUT_MS = 10_000;

export function isGoogleMeetConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET && !!process.env.GOOGLE_REFRESH_TOKEN;
}

async function accessToken(): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as { access_token?: string; error?: string } | null;
    if (!res.ok || !data?.access_token) {
      console.error("[google-meet] token refresh failed", res.status, data?.error);
      return null;
    }
    return data.access_token;
  } catch (e) {
    console.error("[google-meet] token network error", e instanceof Error ? e.message : e);
    return null;
  }
}

export interface MeetResult {
  url: string;
  eventId: string;
}

export async function createMeetLink(opts: { title: string; startsAt: Date; endsAt: Date; requestId: string }): Promise<MeetResult | null> {
  if (!isGoogleMeetConfigured()) return null;
  const token = await accessToken();
  if (!token) return null;
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: opts.title,
        start: { dateTime: opts.startsAt.toISOString() },
        end: { dateTime: opts.endsAt.toISOString() },
        // requestId ซ้ำ = Google คืนห้องเดิม จึงเรียกซ้ำปลอดภัย (ไม่เกิดห้องซ้อน)
        conferenceData: { createRequest: { requestId: opts.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as {
      id?: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
      error?: { message?: string };
    } | null;
    const url = data?.hangoutLink ?? data?.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
    if (!res.ok || !data?.id || !url) {
      console.error("[google-meet] create event failed", res.status, data?.error?.message);
      return null;
    }
    return { url, eventId: data.id };
  } catch (e) {
    console.error("[google-meet] create event network error", e instanceof Error ? e.message : e);
    return null;
  }
}

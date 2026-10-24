import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// รีเฟรช session cookie ของ Supabase ทุก request ตาม pattern แนะนำของ @supabase/ssr
// ถ้าไม่มี proxy นี้ session ฝั่ง server component จะหลุดก่อนเวลาจริง
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF guard: คำขอเปลี่ยนข้อมูลไปที่ /api/ ที่มี Origin ต้องมี host ตรงกับ host ของเว็บเอง
// ไม่มี Origin (server-to-server, curl) ผ่านได้
function isForbiddenOrigin(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (!request.nextUrl.pathname.startsWith("/api/")) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

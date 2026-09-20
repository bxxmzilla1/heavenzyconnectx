import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/tokens";

const ADMIN_COOKIE = "bcp_admin";

/**
 * Gate the admin area behind the admin passcode session cookie.
 * Everything else (public connect pages, login, connect API) is handled by
 * the routes themselves.
 */
export async function proxy(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const payload = secret ? await verifyToken(token, secret) : null;

  if (payload?.sub !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

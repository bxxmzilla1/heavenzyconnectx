import "server-only";
import { cookies, headers } from "next/headers";
import { env } from "./env";
import { signToken, verifyToken } from "./tokens";

export const ADMIN_COOKIE = "bcp_admin";
const PAGE_COOKIE_PREFIX = "bcp_page_";

const ADMIN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PAGE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProduction,
    path: "/",
    maxAge,
  };
}

/* ------------------------------- Admin ---------------------------------- */

export async function createAdminSession(): Promise<void> {
  const token = await signToken({ sub: "admin", exp: Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS }, env.sessionSecret);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(ADMIN_TTL_SECONDS));
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const payload = await verifyToken(token, env.sessionSecret);
  return payload?.sub === "admin";
}

/* ------------------------------- Pages ---------------------------------- */

export function pageCookieName(pageId: string): string {
  return `${PAGE_COOKIE_PREFIX}${pageId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export async function grantPageAccess(pageId: string): Promise<void> {
  const token = await signToken(
    { sub: "page", pid: pageId, exp: Math.floor(Date.now() / 1000) + PAGE_TTL_SECONDS },
    env.sessionSecret,
  );
  (await cookies()).set(pageCookieName(pageId), token, cookieOptions(PAGE_TTL_SECONDS));
}

export async function hasPageAccess(pageId: string): Promise<boolean> {
  const token = (await cookies()).get(pageCookieName(pageId))?.value;
  const payload = await verifyToken(token, env.sessionSecret);
  return payload?.sub === "page" && payload.pid === pageId;
}

/* ------------------------------ Site URL -------------------------------- */

/** Absolute origin of the current deployment, e.g. https://connect.example.com */
export async function getSiteUrl(): Promise<string> {
  if (env.siteUrl) return env.siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Unable to determine site URL; set NEXT_PUBLIC_SITE_URL");
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

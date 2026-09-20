import { NextResponse } from "next/server";
import { bundle } from "@/lib/bundle";
import { createConnection, getBundleApiKey, getPageBySlug, getSettings, updateConnection } from "@/lib/db";
import { getSiteUrl, hasPageAccess } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/start  { slug }
 * Creates a fresh bundle.social team for this attempt and returns the OAuth URL.
 */
export async function POST(req: Request) {
  let slug = "";
  try {
    const body = (await req.json()) as { slug?: string };
    slug = String(body.slug ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const page = await getPageBySlug(slug);
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  if (page.passcode_hash && !(await hasPageAccess(page.id))) {
    return NextResponse.json({ error: "Passcode required." }, { status: 401 });
  }

  const apiKey = await getBundleApiKey();
  if (!apiKey) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const settings = await getSettings();
  const siteUrl = await getSiteUrl();

  // 1) Placeholder team; renamed to the Instagram username after OAuth.
  const placeholder = `Pending · ${page.slug} · ${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
  let team;
  try {
    team = await bundle.createTeam(apiKey, { name: placeholder });
  } catch (err) {
    console.error("[connect/start] createTeam failed", err);
    return NextResponse.json({ error: "Could not create a team in bundle.social." }, { status: 502 });
  }

  const connection = await createConnection({ page_id: page.id, team_id: team.id, team_name: team.name });

  // 2) OAuth URL. bundle.social appends its callback params to redirectUrl.
  const redirectUrl = `${siteUrl}/api/connect/callback?c=${encodeURIComponent(connection.id)}`;
  try {
    const { url } = await bundle.connectSocialAccount(apiKey, {
      type: "INSTAGRAM",
      teamId: team.id,
      redirectUrl,
      instagramConnectionMethod: settings.instagramConnectionMethod,
      disableAutoLogin: settings.disableAutoLogin,
      withBusinessScope: settings.instagramConnectionMethod === "FACEBOOK" ? settings.withBusinessScope : false,
      forceBrowserOAuth: settings.instagramConnectionMethod === "INSTAGRAM",
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[connect/start] connectSocialAccount failed", err);
    await updateConnection(connection.id, { status: "failed", error_code: "connect-url-failed" });
    try {
      await bundle.deleteTeam(apiKey, team.id);
    } catch {
      /* best effort */
    }
    return NextResponse.json({ error: "Could not start the Instagram connection." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { bundle } from "@/lib/bundle";
import { createConnection, getApiKeyForPage, getPageBySlug, getSettings, pageProvider, updateConnection } from "@/lib/db";
import { postpeer } from "@/lib/postpeer";
import { getSiteUrl, hasPageAccess } from "@/lib/session";
import { PROVIDER_LABEL } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/start  { slug }
 * Creates a fresh bundle.social team (or PostPeer profile) for this attempt and returns the OAuth URL.
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

  const provider = pageProvider(page);
  const apiKey = await getApiKeyForPage(page, provider);
  if (!apiKey) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const settings = await getSettings();
  const siteUrl = await getSiteUrl();

  // 1) Placeholder team/profile; renamed to the Instagram username after OAuth.
  const placeholder = `Pending · ${page.slug} · ${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
  let container: { id: string; name: string };
  try {
    container =
      provider === "postpeer"
        ? await postpeer.createProfile(apiKey, placeholder)
        : await bundle.createTeam(apiKey, { name: placeholder });
  } catch (err) {
    console.error(`[connect/start] ${provider} create container failed`, err);
    return NextResponse.json({ error: `Could not create a ${provider === "postpeer" ? "profile" : "team"} in ${PROVIDER_LABEL[provider]}.` }, { status: 502 });
  }

  const connection = await createConnection({ page_id: page.id, provider, team_id: container.id, team_name: container.name });

  // 2) OAuth URL. The provider sends the visitor back to our callback afterwards.
  const redirectUrl = `${siteUrl}/api/connect/callback?c=${encodeURIComponent(connection.id)}`;
  try {
    const { url } =
      provider === "postpeer"
        ? await postpeer.getInstagramConnectUrl(apiKey, {
            profileId: container.id,
            redirectUri: redirectUrl,
            facebookLogin: settings.instagramConnectionMethod === "FACEBOOK",
          })
        : await bundle.connectSocialAccount(apiKey, {
            type: "INSTAGRAM",
            teamId: container.id,
            redirectUrl,
            instagramConnectionMethod: settings.instagramConnectionMethod,
            disableAutoLogin: settings.disableAutoLogin,
            withBusinessScope: settings.instagramConnectionMethod === "FACEBOOK" ? settings.withBusinessScope : false,
            forceBrowserOAuth: settings.instagramConnectionMethod === "INSTAGRAM",
          });
    return NextResponse.json({ url });
  } catch (err) {
    console.error(`[connect/start] ${provider} connect URL failed`, err);
    await updateConnection(connection.id, { status: "failed", error_code: "connect-url-failed" });
    try {
      if (provider === "postpeer") await postpeer.deleteProfile(apiKey, container.id);
      else await bundle.deleteTeam(apiKey, container.id);
    } catch {
      /* best effort */
    }
    return NextResponse.json({ error: "Could not start the Instagram connection." }, { status: 502 });
  }
}

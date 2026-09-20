import { NextResponse } from "next/server";
import { bundle } from "@/lib/bundle";
import { extractCallbackError, failConnection, finalizeConnection, toChannelOptions } from "@/lib/connect";
import { getBundleApiKey, getConnection, getPageById, updateConnection } from "@/lib/db";
import { getSiteUrl } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/connect/callback?c=<connectionId>&<bundle.social params>
 * bundle.social sends the visitor here after the Instagram OAuth flow.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteUrl = await getSiteUrl();
  const connectionId = url.searchParams.get("c") ?? "";

  const connection = connectionId ? await getConnection(connectionId) : null;
  if (!connection) return NextResponse.redirect(`${siteUrl}/`);

  const page = await getPageById(connection.page_id);
  if (!page) return NextResponse.redirect(`${siteUrl}/`);
  const pageUrl = `${siteUrl}/${page.slug}`;

  // Already resolved (e.g. the visitor refreshed the callback URL).
  if (connection.status === "connected") {
    return NextResponse.redirect(`${pageUrl}?status=connected&u=${encodeURIComponent(connection.instagram_username ?? "")}`);
  }
  if (connection.status === "failed") {
    return NextResponse.redirect(`${pageUrl}?status=error&code=${encodeURIComponent(connection.error_code ?? "no-account")}`);
  }

  const apiKey = await getBundleApiKey();
  if (!apiKey) {
    await failConnection(null, connection, "not-configured");
    return NextResponse.redirect(`${pageUrl}?status=error&code=not-configured`);
  }

  const callbackError = extractCallbackError(url.searchParams);

  // Source of truth: is there an Instagram account on the team now?
  let sa = null;
  try {
    sa = await bundle.getSocialAccountByType(apiKey, connection.team_id, "INSTAGRAM");
  } catch (err) {
    console.error("[connect/callback] by-type failed", err);
  }

  if (!sa) {
    const code = callbackError ?? "no-account";
    await failConnection(apiKey, connection, code);
    return NextResponse.redirect(`${pageUrl}?status=error&code=${encodeURIComponent(code)}`);
  }

  // Instagram-via-Facebook: a channel (the actual IG account) may need to be picked.
  const needsChannel = sa.instagramConnectionMethod === "FACEBOOK" || (sa.channels?.length ?? 0) > 0;
  if (needsChannel && !sa.externalId) {
    const channels = toChannelOptions(sa);
    if (channels.length === 0) {
      await failConnection(apiKey, connection, "instagram-not-enough-accounts");
      return NextResponse.redirect(`${pageUrl}?status=error&code=instagram-not-enough-accounts`);
    }
    if (channels.length === 1) {
      try {
        await bundle.setChannel(apiKey, { type: "INSTAGRAM", teamId: connection.team_id, channelId: channels[0].id });
        sa = (await bundle.getSocialAccountByType(apiKey, connection.team_id, "INSTAGRAM")) ?? sa;
      } catch (err) {
        console.error("[connect/callback] setChannel failed", err);
      }
      const { username } = await finalizeConnection(apiKey, connection, sa, channels[0]);
      return NextResponse.redirect(`${pageUrl}?status=connected&u=${encodeURIComponent(username)}`);
    }
    await updateConnection(connection.id, { status: "needs_channel", channels, social_account_id: sa.id });
    return NextResponse.redirect(`${pageUrl}?status=choose&c=${encodeURIComponent(connection.id)}`);
  }

  const { username } = await finalizeConnection(apiKey, connection, sa);
  return NextResponse.redirect(`${pageUrl}?status=connected&u=${encodeURIComponent(username)}`);
}

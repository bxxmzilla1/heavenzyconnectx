import { NextResponse } from "next/server";
import { bundle } from "@/lib/bundle";
import { finalizeConnection } from "@/lib/connect";
import { getBundleApiKey, getConnection, getPageById } from "@/lib/db";
import { hasPageAccess } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/choose  { connectionId, channelId }
 * Used when Instagram-via-Facebook returned several Instagram accounts.
 */
export async function POST(req: Request) {
  let connectionId = "";
  let channelId = "";
  try {
    const body = (await req.json()) as { connectionId?: string; channelId?: string };
    connectionId = String(body.connectionId ?? "");
    channelId = String(body.channelId ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const connection = await getConnection(connectionId);
  if (!connection || connection.status !== "needs_channel") {
    return NextResponse.json({ error: "This connection is not waiting for an account choice." }, { status: 409 });
  }

  const page = await getPageById(connection.page_id);
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  if (page.passcode_hash && !(await hasPageAccess(page.id))) {
    return NextResponse.json({ error: "Passcode required." }, { status: 401 });
  }

  const channel = connection.channels?.find((ch) => ch.id === channelId);
  if (!channel) return NextResponse.json({ error: "Unknown account." }, { status: 400 });

  const apiKey = await getBundleApiKey();
  if (!apiKey) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  try {
    await bundle.setChannel(apiKey, { type: "INSTAGRAM", teamId: connection.team_id, channelId });
  } catch (err) {
    console.error("[connect/choose] setChannel failed", err);
    return NextResponse.json({ error: "bundle.social could not select that account." }, { status: 502 });
  }

  const sa = await bundle.getSocialAccountByType(apiKey, connection.team_id, "INSTAGRAM");
  if (!sa) return NextResponse.json({ error: "Instagram account disappeared." }, { status: 502 });

  const { username } = await finalizeConnection(apiKey, connection, sa, channel);
  return NextResponse.json({ username });
}

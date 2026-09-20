import "server-only";
import { bundle, toTeamName, type BundleSocialAccount } from "./bundle";
import { updateConnection } from "./db";
import type { ChannelOption, ConnectionRow } from "./supabase";

/** Best available handle for an Instagram social account. */
export function deriveUsername(sa: BundleSocialAccount, chosenChannel?: ChannelOption | null): string | null {
  const candidates = [
    sa.username,
    chosenChannel?.username,
    sa.channels && sa.channels.length === 1 ? sa.channels[0]?.username : null,
    sa.displayName,
    sa.userUsername,
  ];
  for (const c of candidates) {
    const v = c?.trim().replace(/^@+/, "");
    if (v) return v;
  }
  return null;
}

export function toChannelOptions(sa: BundleSocialAccount): ChannelOption[] {
  return (sa.channels ?? []).map((ch) => ({
    id: ch.id,
    name: ch.name ?? null,
    username: ch.username ?? null,
    avatarUrl: ch.avatarUrl ?? null,
  }));
}

/**
 * Rename the team to the Instagram username and mark the connection complete.
 * Never throws for a rename failure: the account is connected regardless, so
 * we record what we could and surface a soft warning via team_name.
 */
export async function finalizeConnection(
  apiKey: string,
  connection: ConnectionRow,
  sa: BundleSocialAccount,
  chosenChannel?: ChannelOption | null,
): Promise<{ username: string; teamName: string }> {
  const username = deriveUsername(sa, chosenChannel) ?? `instagram-${sa.id.slice(0, 8)}`;
  let teamName = toTeamName(username);

  try {
    await bundle.updateTeam(apiKey, connection.team_id, { name: teamName });
  } catch {
    // Duplicate names or transient errors: retry once with a short suffix.
    teamName = toTeamName(`${username} ${connection.team_id.slice(-4)}`);
    try {
      await bundle.updateTeam(apiKey, connection.team_id, { name: teamName });
    } catch {
      teamName = connection.team_name ?? teamName;
    }
  }

  await updateConnection(connection.id, {
    status: "connected",
    instagram_username: username,
    team_name: teamName,
    social_account_id: sa.id,
    channels: null,
    error_code: null,
  });

  return { username, teamName };
}

/** Mark the attempt failed and remove the empty placeholder team (best effort). */
export async function failConnection(apiKey: string | null, connection: ConnectionRow, errorCode: string): Promise<void> {
  await updateConnection(connection.id, { status: "failed", error_code: errorCode.slice(0, 120) });
  if (apiKey) {
    try {
      await bundle.deleteTeam(apiKey, connection.team_id);
    } catch {
      // Leave the empty team in place; it is harmless.
    }
  }
}

/** Inspect bundle.social's callback query string for a known error marker. */
export function extractCallbackError(params: URLSearchParams): string | null {
  for (const [key, value] of params) {
    if (key === "c") continue;
    if (/-(not-enough|not-professional)-/.test(key) || /-not-professional-account$/.test(key)) return key;
    if (key === "instagram-direct-callback") return key;
    if (key === "error") return value || "error";
    if (key.endsWith("-callback") && /^(error|false|0|fail|failed)$/i.test(value)) return key;
  }
  return null;
}

export function describeError(code: string | null): string {
  switch (code) {
    case "instagram-not-enough-permissions":
      return "Instagram did not grant all the permissions we need. Please try again and approve every permission.";
    case "instagram-not-enough-accounts":
      return "No Instagram account was found. Make sure your Instagram is a Professional account linked to a Facebook Page you manage.";
    case "instagram-not-professional-account":
      return "That Instagram account is not a Professional (Business or Creator) account. Switch it in Instagram settings and try again.";
    case "no-account":
      return "The connection did not complete. Please try again.";
    case "not-configured":
      return "This page is not fully set up yet. Please contact the person who sent you this link.";
    default:
      return "Something went wrong while connecting Instagram. Please try again.";
  }
}

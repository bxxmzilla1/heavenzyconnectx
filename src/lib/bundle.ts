import "server-only";

/**
 * Minimal typed client for the bundle.social REST API.
 * Docs: https://docs.bundle.social/api-reference/introduction
 */

const BASE_URL = "https://api.bundle.social";

export class BundleApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "BundleApiError";
    this.status = status;
    this.body = body;
  }
}

export type SocialAccountType =
  | "TIKTOK" | "YOUTUBE" | "INSTAGRAM" | "FACEBOOK" | "TWITTER" | "THREADS" | "LINKEDIN"
  | "PINTEREST" | "REDDIT" | "MASTODON" | "DISCORD" | "SLACK" | "BLUESKY" | "GOOGLE_BUSINESS" | "SNAPCHAT";

export type BundleTeam = {
  id: string;
  name: string;
  avatarUrl: string | null;
  organizationId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BundleChannel = {
  id: string;
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

export type BundleSocialAccount = {
  id: string;
  type: SocialAccountType;
  teamId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  externalId: string | null;
  userUsername: string | null;
  userDisplayName: string | null;
  channels: BundleChannel[] | null;
  instagramConnectionMethod: "FACEBOOK" | "INSTAGRAM" | null;
};

export type BundleOrganization = {
  id: string;
  name: string;
  teams?: { id: string; name: string }[];
};

async function request<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : null) ?? `bundle.social API error ${res.status}`;
    throw new BundleApiError(res.status, message, body);
  }
  return body as T;
}

export const bundle = {
  getOrganization(apiKey: string) {
    return request<BundleOrganization>(apiKey, "/api/v1/organization/");
  },

  createTeam(apiKey: string, input: { name: string; avatarUrl?: string | null }) {
    return request<BundleTeam>(apiKey, "/api/v1/team/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getTeam(apiKey: string, id: string) {
    return request<BundleTeam & { socialAccounts: BundleSocialAccount[] }>(apiKey, `/api/v1/team/${encodeURIComponent(id)}`);
  },

  updateTeam(apiKey: string, id: string, input: { name?: string; avatarUrl?: string | null }) {
    return request<BundleTeam>(apiKey, `/api/v1/team/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteTeam(apiKey: string, id: string) {
    return request<unknown>(apiKey, `/api/v1/team/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  connectSocialAccount(
    apiKey: string,
    input: {
      type: SocialAccountType;
      teamId: string;
      redirectUrl: string;
      instagramConnectionMethod?: "FACEBOOK" | "INSTAGRAM";
      disableAutoLogin?: boolean;
      withBusinessScope?: boolean;
      forceBrowserOAuth?: boolean;
    },
  ) {
    return request<{ url: string }>(apiKey, "/api/v1/social-account/connect", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getSocialAccountByType(apiKey: string, teamId: string, type: SocialAccountType): Promise<BundleSocialAccount | null> {
    const qs = new URLSearchParams({ type, teamId }).toString();
    try {
      return await request<BundleSocialAccount>(apiKey, `/api/v1/social-account/by-type?${qs}`);
    } catch (err) {
      if (err instanceof BundleApiError && err.status === 404) return null;
      throw err;
    }
  },

  setChannel(apiKey: string, input: { type: SocialAccountType; teamId: string; channelId: string }) {
    return request<BundleSocialAccount>(apiKey, "/api/v1/social-account/set-channel", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

/** bundle.social requires team names to be 3–80 characters. */
export function toTeamName(username: string): string {
  const clean = username.trim().replace(/^@+/, "");
  const base = clean.length >= 3 ? clean : `${clean} (Instagram)`;
  return base.slice(0, 80);
}

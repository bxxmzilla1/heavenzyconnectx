import "server-only";

/**
 * Minimal typed client for the PostPeer REST API.
 * Docs: https://www.postpeer.dev/docs
 */

const BASE_URL = "https://api.postpeer.dev/v1";

export class PostPeerApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "PostPeerApiError";
    this.status = status;
    this.body = body;
  }
}

export type PostPeerProfile = {
  id: string;
  name: string;
  description: string | null;
  integrationCount: number;
};

export type PostPeerIntegration = {
  id: string;
  platform: string;
  platformUserId: string | null;
  displayName: string | null;
  imageUrl: string | null;
  profileId: string | null;
  createdAt: string;
};

async function request<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-access-key": apiKey,
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
    const b = body as { message?: unknown; error?: unknown } | null;
    const message =
      (typeof b?.message === "string" && b.message) ||
      (typeof b?.error === "string" && b.error) ||
      `PostPeer API error ${res.status}`;
    throw new PostPeerApiError(res.status, message, body);
  }
  return body as T;
}

export const postpeer = {
  verifyKey(apiKey: string) {
    return request<{ ok: boolean }>(apiKey, "/health/auth");
  },

  async createProfile(apiKey: string, name: string): Promise<PostPeerProfile> {
    const res = await request<{ profile: PostPeerProfile }>(apiKey, "/profiles", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return res.profile;
  },

  async updateProfile(apiKey: string, id: string, name: string): Promise<PostPeerProfile> {
    const res = await request<{ profile: PostPeerProfile }>(apiKey, `/profiles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    return res.profile;
  },

  /** Only succeeds for profiles with no active integrations. */
  deleteProfile(apiKey: string, id: string) {
    return request<unknown>(apiKey, `/profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  getInstagramConnectUrl(apiKey: string, input: { profileId: string; redirectUri: string; facebookLogin: boolean }) {
    const qs = new URLSearchParams({ profileId: input.profileId, redirectUri: input.redirectUri });
    if (input.facebookLogin) qs.set("loginMethod", "facebook_login");
    return request<{ url: string }>(apiKey, `/connect/instagram?${qs.toString()}`);
  },

  async listInstagramIntegrations(apiKey: string, profileId: string): Promise<PostPeerIntegration[]> {
    const qs = new URLSearchParams({ platform: "instagram", profileId, limit: "100" });
    const res = await request<{ integrations: PostPeerIntegration[] }>(apiKey, `/connect/integrations?${qs.toString()}`);
    return res.integrations ?? [];
  },
};

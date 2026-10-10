import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

import type { Provider } from "./providers";

export { PROVIDER_LABEL, type Provider } from "./providers";

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  passcode_hash: string | null;
  /** Which API this page connects accounts through. Missing on databases without the migration. */
  provider?: Provider | null;
  /** Page-specific API keys (encrypted). Null = use the global key from Settings. */
  bundle_api_key_enc: string | null;
  postpeer_api_key_enc?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectionStatus = "pending" | "needs_channel" | "connected" | "failed";

export type ChannelOption = {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type ConnectionRow = {
  id: string;
  page_id: string;
  provider?: Provider | null;
  /** bundle.social team id, or PostPeer profile id. */
  team_id: string;
  team_name: string | null;
  instagram_username: string | null;
  social_account_id: string | null;
  status: ConnectionStatus;
  error_code: string | null;
  channels: ChannelOption[] | null;
  created_at: string;
  updated_at: string;
};

export type InstagramConnectionMethod = "INSTAGRAM" | "FACEBOOK";

export type SettingsRow = {
  id: string;
  bundle_api_key_enc: string | null;
  postpeer_api_key_enc?: string | null;
  instagram_connection_method: InstagramConnectionMethod;
  disable_auto_login: boolean;
  with_business_scope: boolean;
  updated_at: string;
};

let client: SupabaseClient | null = null;

/**
 * Service-role client. Only ever used on the server; RLS is enabled on all
 * tables with no policies, so the anon key cannot read anything.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

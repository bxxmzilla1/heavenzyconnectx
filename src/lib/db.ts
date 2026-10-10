import "server-only";
import { decryptSecret, encryptSecret } from "./crypto";
import {
  supabaseAdmin,
  type ConnectionRow,
  type ConnectionStatus,
  type ChannelOption,
  type InstagramConnectionMethod,
  type PageRow,
  type Provider,
  type SettingsRow,
} from "./supabase";

/* -------------------------------- Pages --------------------------------- */

export async function listPages(): Promise<(PageRow & { connected_count: number })[]> {
  const sb = supabaseAdmin();
  const { data: pages, error } = await sb.from("pages").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  const { data: conns, error: cErr } = await sb.from("connections").select("page_id").eq("status", "connected");
  if (cErr) throw cErr;

  const counts = new Map<string, number>();
  for (const c of conns ?? []) counts.set(c.page_id, (counts.get(c.page_id) ?? 0) + 1);

  return (pages ?? []).map((p) => ({ ...(p as PageRow), connected_count: counts.get(p.id) ?? 0 }));
}

export async function getPageById(id: string): Promise<PageRow | null> {
  const { data, error } = await supabaseAdmin().from("pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as PageRow) ?? null;
}

export async function getPageBySlug(slug: string): Promise<PageRow | null> {
  const { data, error } = await supabaseAdmin().from("pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as PageRow) ?? null;
}

export async function createPage(input: { slug: string; title: string; passcode_hash: string | null }): Promise<PageRow> {
  const { data, error } = await supabaseAdmin().from("pages").insert(input).select("*").single();
  if (error) throw error;
  return data as PageRow;
}

export async function updatePage(
  id: string,
  patch: Partial<Pick<PageRow, "slug" | "title" | "passcode_hash" | "bundle_api_key_enc" | "postpeer_api_key_enc" | "provider">>,
): Promise<PageRow> {
  const { data, error } = await supabaseAdmin()
    .from("pages")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as PageRow;
}

export function pageProvider(page: PageRow): Provider {
  return page.provider === "postpeer" ? "postpeer" : "bundle";
}

function pageKeyColumn(provider: Provider): "bundle_api_key_enc" | "postpeer_api_key_enc" {
  return provider === "postpeer" ? "postpeer_api_key_enc" : "bundle_api_key_enc";
}

export async function setPageApiKey(id: string, provider: Provider, apiKey: string | null): Promise<void> {
  await updatePage(id, { [pageKeyColumn(provider)]: apiKey ? encryptSecret(apiKey) : null });
}

function keyHint(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    return decryptSecret(enc).slice(-4);
  } catch {
    return "????";
  }
}

/** Last 4 characters of the page's own key for that provider, or null if it uses the global key. */
export function pageApiKeyHint(page: PageRow, provider: Provider): string | null {
  return keyHint(page[pageKeyColumn(provider)]);
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("pages").delete().eq("id", id);
  if (error) throw error;
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

/* ----------------------------- Connections ------------------------------ */

export async function listConnectionsForPage(pageId: string): Promise<ConnectionRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("connections")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConnectionRow[];
}

export async function deleteConnectionsForPage(pageId: string): Promise<void> {
  const { error } = await supabaseAdmin().from("connections").delete().eq("page_id", pageId);
  if (error) throw error;
}

export async function getConnection(id: string): Promise<ConnectionRow | null> {
  const { data, error } = await supabaseAdmin().from("connections").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow) ?? null;
}

export async function createConnection(input: {
  page_id: string;
  provider: Provider;
  team_id: string;
  team_name: string;
}): Promise<ConnectionRow> {
  const { provider, ...rest } = input;
  // Leave `provider` to the column default for bundle so databases without the PostPeer migration keep working.
  const row = provider === "bundle" ? rest : input;
  const { data, error } = await supabaseAdmin()
    .from("connections")
    .insert({ ...row, status: "pending" satisfies ConnectionStatus })
    .select("*")
    .single();
  if (error) throw error;
  return data as ConnectionRow;
}

export async function updateConnection(
  id: string,
  patch: Partial<{
    status: ConnectionStatus;
    team_name: string | null;
    instagram_username: string | null;
    social_account_id: string | null;
    error_code: string | null;
    channels: ChannelOption[] | null;
  }>,
): Promise<ConnectionRow> {
  const { data, error } = await supabaseAdmin()
    .from("connections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ConnectionRow;
}

/* ------------------------------- Settings ------------------------------- */

const SETTINGS_ID = "default";

export type Settings = {
  hasApiKey: boolean;
  /** Last 4 characters of the API key, for display only. */
  apiKeyHint: string | null;
  hasPostpeerKey: boolean;
  postpeerKeyHint: string | null;
  instagramConnectionMethod: InstagramConnectionMethod;
  disableAutoLogin: boolean;
  withBusinessScope: boolean;
};

async function getSettingsRow(): Promise<SettingsRow | null> {
  const { data, error } = await supabaseAdmin().from("settings").select("*").eq("id", SETTINGS_ID).maybeSingle();
  if (error) throw error;
  return (data as SettingsRow) ?? null;
}

export async function getSettings(): Promise<Settings> {
  const row = await getSettingsRow();
  return {
    hasApiKey: Boolean(row?.bundle_api_key_enc),
    apiKeyHint: keyHint(row?.bundle_api_key_enc),
    hasPostpeerKey: Boolean(row?.postpeer_api_key_enc),
    postpeerKeyHint: keyHint(row?.postpeer_api_key_enc),
    instagramConnectionMethod: row?.instagram_connection_method ?? "INSTAGRAM",
    disableAutoLogin: row?.disable_auto_login ?? true,
    withBusinessScope: row?.with_business_scope ?? false,
  };
}

/** Decrypted bundle.social API key, or null if not configured. */
export async function getBundleApiKey(): Promise<string | null> {
  const row = await getSettingsRow();
  if (!row?.bundle_api_key_enc) return null;
  return decryptSecret(row.bundle_api_key_enc);
}

/** Decrypted global PostPeer API key, or null if not configured. */
export async function getPostpeerApiKey(): Promise<string | null> {
  const row = await getSettingsRow();
  if (!row?.postpeer_api_key_enc) return null;
  return decryptSecret(row.postpeer_api_key_enc);
}

/** The page's own bundle.social key if it has one, otherwise the global key from Settings. */
export async function getBundleApiKeyForPage(page: PageRow): Promise<string | null> {
  if (page.bundle_api_key_enc) return decryptSecret(page.bundle_api_key_enc);
  return getBundleApiKey();
}

/** Key for the given provider: the page's own key if set, otherwise the global key. */
export async function getApiKeyForPage(page: PageRow, provider: Provider = pageProvider(page)): Promise<string | null> {
  if (provider === "bundle") return getBundleApiKeyForPage(page);
  if (page.postpeer_api_key_enc) return decryptSecret(page.postpeer_api_key_enc);
  return getPostpeerApiKey();
}

export async function saveSettings(patch: {
  apiKey?: string | null; // undefined = leave unchanged, null = clear
  postpeerApiKey?: string | null;
  instagramConnectionMethod?: InstagramConnectionMethod;
  disableAutoLogin?: boolean;
  withBusinessScope?: boolean;
}): Promise<void> {
  const update: Record<string, unknown> = { id: SETTINGS_ID, updated_at: new Date().toISOString() };
  if (patch.apiKey !== undefined) update.bundle_api_key_enc = patch.apiKey ? encryptSecret(patch.apiKey) : null;
  if (patch.postpeerApiKey !== undefined) {
    update.postpeer_api_key_enc = patch.postpeerApiKey ? encryptSecret(patch.postpeerApiKey) : null;
  }
  if (patch.instagramConnectionMethod !== undefined) update.instagram_connection_method = patch.instagramConnectionMethod;
  if (patch.disableAutoLogin !== undefined) update.disable_auto_login = patch.disableAutoLogin;
  if (patch.withBusinessScope !== undefined) update.with_business_scope = patch.withBusinessScope;

  const { error } = await supabaseAdmin().from("settings").upsert(update, { onConflict: "id" });
  if (error) throw error;
}

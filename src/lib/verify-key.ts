import "server-only";
import { bundle, BundleApiError } from "./bundle";
import { postpeer, PostPeerApiError } from "./postpeer";
import { PROVIDER_LABEL, type Provider } from "./supabase";

/** Check an API key against the provider. Returns a short description on success, or an error message. */
export async function verifyProviderKey(
  provider: Provider,
  apiKey: string,
): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  const label = PROVIDER_LABEL[provider];
  try {
    if (provider === "postpeer") {
      await postpeer.verifyKey(apiKey);
      return { ok: true, detail: "PostPeer project" };
    }
    const org = await bundle.getOrganization(apiKey);
    return { ok: true, detail: `organization "${org.name}"` };
  } catch (err) {
    const status = err instanceof BundleApiError || err instanceof PostPeerApiError ? err.status : 0;
    if (status === 401 || status === 403) {
      return { ok: false, error: `${label} rejected that API key. Double-check it and try again.` };
    }
    const message = err instanceof Error ? err.message : "unknown error";
    return { ok: false, error: `Could not verify the key with ${label}: ${message}` };
  }
}

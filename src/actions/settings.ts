"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBundleApiKey, getPostpeerApiKey, saveSettings } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { PROVIDER_LABEL, type InstagramConnectionMethod, type Provider } from "@/lib/supabase";
import { verifyProviderKey } from "@/lib/verify-key";
import { errorMessage, type ActionState } from "./types";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

function parseProvider(value: FormDataEntryValue | null): Provider {
  return value === "postpeer" ? "postpeer" : "bundle";
}

export async function saveApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const provider = parseProvider(formData.get("provider"));
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { error: `Paste your ${PROVIDER_LABEL[provider]} API key.` };
  if (apiKey.length < 10) return { error: "That does not look like a valid API key." };

  const check = await verifyProviderKey(provider, apiKey);
  if (!check.ok) return { error: check.error };

  try {
    await saveSettings(provider === "postpeer" ? { postpeerApiKey: apiKey } : { apiKey });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { success: `API key verified (${check.detail}) and saved.` };
}

export async function clearApiKeyAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const provider = parseProvider(formData.get("provider"));
  await saveSettings(provider === "postpeer" ? { postpeerApiKey: null } : { apiKey: null });
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

export async function saveConnectOptionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const methodRaw = String(formData.get("instagramConnectionMethod") ?? "INSTAGRAM");
  const method: InstagramConnectionMethod = methodRaw === "FACEBOOK" ? "FACEBOOK" : "INSTAGRAM";
  const disableAutoLogin = formData.get("disableAutoLogin") === "on";
  const withBusinessScope = formData.get("withBusinessScope") === "on";

  try {
    await saveSettings({ instagramConnectionMethod: method, disableAutoLogin, withBusinessScope });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/admin/settings");
  return { success: "Connection options saved." };
}

export async function testConnectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const provider = parseProvider(formData.get("provider"));
  const apiKey = provider === "postpeer" ? await getPostpeerApiKey() : await getBundleApiKey();
  if (!apiKey) return { error: "No API key saved yet." };
  const check = await verifyProviderKey(provider, apiKey);
  return check.ok ? { success: `Connected to ${check.detail}.` } : { error: check.error };
}

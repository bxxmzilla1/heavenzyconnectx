"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bundle, BundleApiError } from "@/lib/bundle";
import { getBundleApiKey, saveSettings } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import type { InstagramConnectionMethod } from "@/lib/supabase";
import { errorMessage, type ActionState } from "./types";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

export async function saveApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { error: "Paste your bundle.social API key." };
  if (apiKey.length < 10) return { error: "That does not look like a valid API key." };

  // Validate the key against the API before storing it.
  try {
    await bundle.getOrganization(apiKey);
  } catch (err) {
    if (err instanceof BundleApiError && (err.status === 401 || err.status === 403)) {
      return { error: "bundle.social rejected that API key. Double-check it and try again." };
    }
    return { error: `Could not verify the key with bundle.social: ${errorMessage(err)}` };
  }

  try {
    await saveSettings({ apiKey });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { success: "API key verified and saved." };
}

export async function clearApiKeyAction(): Promise<void> {
  await requireAdmin();
  await saveSettings({ apiKey: null });
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

export async function testConnectionAction(_prev: ActionState): Promise<ActionState> {
  await requireAdmin();
  const apiKey = await getBundleApiKey();
  if (!apiKey) return { error: "No API key saved yet." };
  try {
    const org = await bundle.getOrganization(apiKey);
    const teams = org.teams?.length ?? 0;
    return { success: `Connected to organization "${org.name}" (${teams} team${teams === 1 ? "" : "s"}).` };
  } catch (err) {
    return { error: `bundle.social returned an error: ${errorMessage(err)}` };
  }
}

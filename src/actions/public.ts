"use server";

import { verifyPasscode } from "@/lib/crypto";
import { getPageBySlug } from "@/lib/db";
import { grantPageAccess } from "@/lib/session";
import type { ActionState } from "./types";

export async function unlockPageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get("slug") ?? "");
  const passcode = String(formData.get("passcode") ?? "");
  if (!passcode) return { error: "Enter the passcode." };

  const page = await getPageBySlug(slug);
  if (!page) return { error: "This page no longer exists." };
  if (!page.passcode_hash) return { success: "ok" };

  if (!verifyPasscode(passcode, page.passcode_hash)) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Incorrect passcode." };
  }

  await grantPageAccess(page.id);
  return { success: "ok" };
}

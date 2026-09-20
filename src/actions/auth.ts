"use server";

import { redirect } from "next/navigation";
import { safeEqual } from "@/lib/crypto";
import { env } from "@/lib/env";
import { createAdminSession, destroyAdminSession } from "@/lib/session";
import type { ActionState } from "./types";

function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/admin";
  // Only allow same-origin relative paths.
  if (!next.startsWith("/") || next.startsWith("//")) return "/admin";
  return next;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const passcode = String(formData.get("passcode") ?? "");
  const next = safeNext(formData.get("next"));

  if (!passcode) return { error: "Enter the passcode." };

  let expected: string;
  try {
    expected = env.adminPasscode;
  } catch {
    return { error: "ADMIN_PASSCODE is not configured on the server." };
  }

  if (!safeEqual(passcode, expected)) {
    // Small delay to blunt brute-force attempts.
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Incorrect passcode." };
  }

  await createAdminSession();
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/login");
}

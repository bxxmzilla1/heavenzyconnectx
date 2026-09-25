"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPasscode } from "@/lib/crypto";
import { createPage, deleteConnectionsForPage, deletePage, getPageById, isUniqueViolation, updatePage } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { normaliseSlug, validateSlug } from "@/lib/slug";
import { errorMessage, type ActionState } from "./types";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

export async function createPageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const slug = normaliseSlug(String(formData.get("slug") ?? "") || title);
  const passcode = String(formData.get("passcode") ?? "").trim();

  if (!title) return { error: "Give the page a title." };
  if (title.length > 120) return { error: "Title must be 120 characters or fewer." };
  const slugError = validateSlug(slug);
  if (slugError) return { error: slugError };
  if (passcode && passcode.length < 4) return { error: "Passcode must be at least 4 characters." };

  try {
    const page = await createPage({ title, slug, passcode_hash: passcode ? hashPasscode(passcode) : null });
    revalidatePath("/admin");
    redirect(`/admin/pages/${page.id}?created=1`);
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `The slug "${slug}" is already taken.` };
    throw err;
  }
}

export async function updatePageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const page = await getPageById(id);
  if (!page) return { error: "Page not found." };

  const title = String(formData.get("title") ?? "").trim();
  const slug = normaliseSlug(String(formData.get("slug") ?? ""));
  if (!title) return { error: "Give the page a title." };
  if (title.length > 120) return { error: "Title must be 120 characters or fewer." };
  const slugError = validateSlug(slug);
  if (slugError) return { error: slugError };

  try {
    await updatePage(id, { title, slug });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `The slug "${slug}" is already taken.` };
    return { error: errorMessage(err) };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/pages/${id}`);
  return { success: "Page saved." };
}

export async function setPagePasscodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const passcode = String(formData.get("passcode") ?? "").trim();
  const page = await getPageById(id);
  if (!page) return { error: "Page not found." };
  if (passcode.length < 4) return { error: "Passcode must be at least 4 characters." };

  try {
    await updatePage(id, { passcode_hash: hashPasscode(passcode) });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/pages/${id}`);
  return { success: "Passcode updated." };
}

export async function removePagePasscodeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await updatePage(id, { passcode_hash: null });
  revalidatePath("/admin");
  revalidatePath(`/admin/pages/${id}`);
}

export async function resetConnectionsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deleteConnectionsForPage(id);
  revalidatePath("/admin");
  revalidatePath(`/admin/pages/${id}`);
}

export async function deletePageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deletePage(id);
  revalidatePath("/admin");
  redirect("/admin?deleted=1");
}

"use client";

import { useActionState, useState } from "react";
import { setPagePasscodeAction, updatePageAction } from "@/actions/pages";
import { initialActionState } from "@/actions/types";
import { ActionMessage } from "@/components/ActionMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { normaliseSlug } from "@/lib/slug";

export function EditPageForm({ page, siteUrl }: { page: { id: string; title: string; slug: string }; siteUrl: string }) {
  const [state, action] = useActionState(updatePageAction, initialActionState);
  const [slug, setSlug] = useState(page.slug);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={page.id} />
      <div>
        <label htmlFor="title" className="label">
          Title
        </label>
        <input id="title" name="title" required defaultValue={page.title} className="input" />
      </div>
      <div>
        <label htmlFor="slug" className="label">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          required
          className="input"
          value={slug}
          onChange={(e) => setSlug(normaliseSlug(e.target.value))}
        />
        <p className="mt-1 truncate text-xs text-muted">
          {siteUrl}/{slug || "…"}
        </p>
      </div>
      <ActionMessage state={state} />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}

export function PasscodeForm({ pageId, hasPasscode }: { pageId: string; hasPasscode: boolean }) {
  const [state, action] = useActionState(setPagePasscodeAction, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={pageId} />
      <div>
        <label htmlFor="passcode" className="label">
          {hasPasscode ? "New passcode" : "Set a passcode"}
        </label>
        <input
          id="passcode"
          name="passcode"
          required
          minLength={4}
          autoComplete="off"
          className="input"
          placeholder="At least 4 characters"
        />
      </div>
      <ActionMessage state={state} />
      <SubmitButton className="btn btn-secondary">{hasPasscode ? "Change passcode" : "Set passcode"}</SubmitButton>
    </form>
  );
}

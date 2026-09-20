"use client";

import { useActionState, useState } from "react";
import { createPageAction } from "@/actions/pages";
import { initialActionState } from "@/actions/types";
import { ActionMessage } from "@/components/ActionMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { normaliseSlug } from "@/lib/slug";

export function CreatePageForm({ siteUrl }: { siteUrl: string }) {
  const [state, action] = useActionState(createPageAction, initialActionState);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const effectiveSlug = slugTouched ? slug : normaliseSlug(title);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-3">
      <div>
        <label htmlFor="title" className="label">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          className="input"
          placeholder="Client onboarding"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="slug" className="label">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          className="input"
          placeholder="client-onboarding"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(normaliseSlug(e.target.value));
          }}
        />
        <p className="mt-1 truncate text-xs text-muted">
          {siteUrl}/{effectiveSlug || "…"}
        </p>
      </div>
      <div>
        <label htmlFor="passcode" className="label">
          Passcode <span className="text-muted/70">(optional)</span>
        </label>
        <input id="passcode" name="passcode" className="input" placeholder="Leave blank for no passcode" autoComplete="off" />
      </div>
      <div className="md:col-span-3">
        <ActionMessage state={state} />
      </div>
      <div className="md:col-span-3">
        <SubmitButton pendingText="Creating…">Create page</SubmitButton>
      </div>
    </form>
  );
}

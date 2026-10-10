"use client";

import { useActionState, useState } from "react";
import { savePageApiKeyAction, setPagePasscodeAction, setPageProviderAction, updatePageAction } from "@/actions/pages";
import { PROVIDER_LABEL, type Provider } from "@/lib/providers";
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

export function ProviderForm({ pageId, provider }: { pageId: string; provider: Provider }) {
  const [state, action] = useActionState(setPageProviderAction, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={pageId} />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["bundle", "postpeer"] as const).map((p) => (
          <label
            key={p}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-panel-2 p-4 has-[:checked]:border-accent"
          >
            <input type="radio" name="provider" value={p} defaultChecked={provider === p} />
            <span className="font-medium">{PROVIDER_LABEL[p]}</span>
          </label>
        ))}
      </div>
      <ActionMessage state={state} />
      <SubmitButton className="btn btn-secondary">Save provider</SubmitButton>
    </form>
  );
}

export function PageApiKeyForm({ pageId, provider, hasKey }: { pageId: string; provider: Provider; hasKey: boolean }) {
  const [state, action] = useActionState(savePageApiKeyAction, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={pageId} />
      <input type="hidden" name="provider" value={provider} />
      <div>
        <label htmlFor="apiKey" className="label">
          {hasKey ? `Replace this page's ${PROVIDER_LABEL[provider]} key` : `${PROVIDER_LABEL[provider]} key for this page`}
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          required
          autoComplete="off"
          className="input font-mono"
          placeholder={provider === "postpeer" ? "PostPeer access key" : "pk_live_…"}
        />
      </div>
      <ActionMessage state={state} />
      <SubmitButton className="btn btn-secondary" pendingText="Verifying…">
        {hasKey ? "Verify & replace" : "Verify & save"}
      </SubmitButton>
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

"use client";

import { useActionState } from "react";
import { saveApiKeyAction, saveConnectOptionsAction, testConnectionAction } from "@/actions/settings";
import { initialActionState } from "@/actions/types";
import { ActionMessage } from "@/components/ActionMessage";
import { SubmitButton } from "@/components/SubmitButton";
import type { InstagramConnectionMethod } from "@/lib/supabase";

export function ApiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [state, action] = useActionState(saveApiKeyAction, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="apiKey" className="label">
          {hasKey ? "Replace API key" : "API key"}
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          required
          autoComplete="off"
          className="input font-mono"
          placeholder="pk_live_…"
        />
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingText="Verifying…">{hasKey ? "Verify & replace" : "Verify & save"}</SubmitButton>
    </form>
  );
}

export function TestConnectionButton() {
  const [state, action] = useActionState(testConnectionAction, initialActionState);
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton className="btn btn-secondary" pendingText="Testing…">
        Test connection
      </SubmitButton>
      {state.error && <span className="text-sm text-danger">{state.error}</span>}
      {state.success && <span className="text-sm text-success">{state.success}</span>}
    </form>
  );
}

export function ConnectOptionsForm({
  method,
  disableAutoLogin,
  withBusinessScope,
}: {
  method: InstagramConnectionMethod;
  disableAutoLogin: boolean;
  withBusinessScope: boolean;
}) {
  const [state, action] = useActionState(saveConnectOptionsAction, initialActionState);

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="label">Connection method</legend>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-panel-2 p-4 has-[:checked]:border-accent">
          <input type="radio" name="instagramConnectionMethod" value="INSTAGRAM" defaultChecked={method === "INSTAGRAM"} className="mt-1" />
          <span>
            <span className="block font-medium">Direct Instagram login (recommended)</span>
            <span className="block text-sm text-muted">
              The visitor logs in with Instagram and picks the account during OAuth. Simplest flow; the team is named after the
              chosen account immediately.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-panel-2 p-4 has-[:checked]:border-accent">
          <input type="radio" name="instagramConnectionMethod" value="FACEBOOK" defaultChecked={method === "FACEBOOK"} className="mt-1" />
          <span>
            <span className="block font-medium">Instagram via Facebook login</span>
            <span className="block text-sm text-muted">
              Required for Facebook-backed features (comments, insights, audio search). If the visitor manages several Instagram
              accounts they will be asked to pick one after logging in.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="disableAutoLogin" defaultChecked={disableAutoLogin} />
          <span>
            Disable auto-login <span className="text-muted">— always show the account picker instead of reusing the browser session</span>
          </span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="withBusinessScope" defaultChecked={withBusinessScope} />
          <span>
            Request business scopes <span className="text-muted">— Facebook method only; exposes accounts hidden from the standard scope</span>
          </span>
        </label>
      </div>

      <ActionMessage state={state} />
      <SubmitButton>Save options</SubmitButton>
    </form>
  );
}

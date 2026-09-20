import { clearApiKeyAction } from "@/actions/settings";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { getSettings } from "@/lib/db";
import { ApiKeyForm, ConnectOptionsForm, TestConnectionButton } from "./forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">Configure how this app talks to bundle.social.</p>
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">bundle.social API key</h2>
          <p className="mt-1 text-sm text-muted">
            Create a key in your bundle.social dashboard under <em>API Keys</em>. It is verified against the API before being saved
            and stored encrypted.
          </p>
        </div>

        {settings.hasApiKey ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
            <div className="text-sm">
              <span className="text-success">Key saved</span>{" "}
              <span className="font-mono text-muted">••••••••{settings.apiKeyHint}</span>
            </div>
            <div className="flex items-center gap-2">
              <TestConnectionButton />
              <form action={clearApiKeyAction}>
                <ConfirmSubmit className="btn btn-danger" message="Remove the saved API key? Connect buttons will stop working.">
                  Remove
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ) : (
          <p className="alert-warn">No API key saved yet.</p>
        )}

        <ApiKeyForm hasKey={settings.hasApiKey} />
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Instagram connection</h2>
          <p className="mt-1 text-sm text-muted">Options passed to bundle.social when starting the OAuth flow.</p>
        </div>
        <ConnectOptionsForm
          method={settings.instagramConnectionMethod}
          disableAutoLogin={settings.disableAutoLogin}
          withBusinessScope={settings.withBusinessScope}
        />
      </section>
    </div>
  );
}

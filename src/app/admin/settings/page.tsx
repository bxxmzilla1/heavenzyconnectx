import { clearApiKeyAction } from "@/actions/settings";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { getSettings } from "@/lib/db";
import { PROVIDER_LABEL, type Provider } from "@/lib/supabase";
import { ApiKeyForm, ConnectOptionsForm, TestConnectionButton } from "./forms";

export const dynamic = "force-dynamic";

function GlobalKeySection({
  provider,
  hasKey,
  hint,
  description,
}: {
  provider: Provider;
  hasKey: boolean;
  hint: string | null;
  description: React.ReactNode;
}) {
  const label = PROVIDER_LABEL[provider];
  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Global {label} API key</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      {hasKey ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
          <div className="text-sm">
            <span className="text-success">Key saved</span> <span className="font-mono text-muted">••••••••{hint}</span>
          </div>
          <div className="flex items-center gap-2">
            <TestConnectionButton provider={provider} />
            <form action={clearApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <ConfirmSubmit
                className="btn btn-danger"
                message={`Remove the global ${label} key? ${label} pages without their own key will stop working.`}
              >
                Remove
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      ) : (
        <p className="alert-warn">No global {label} key saved.</p>
      )}

      <ApiKeyForm provider={provider} hasKey={hasKey} />
    </section>
  );
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Global API keys are used by every page that does not have its own key. Each page chooses its provider on its admin
          screen.
        </p>
      </div>

      <GlobalKeySection
        provider="bundle"
        hasKey={settings.hasApiKey}
        hint={settings.apiKeyHint}
        description={
          <>
            Create a key in your bundle.social dashboard under <em>API Keys</em>. It is verified before being saved and stored
            encrypted.
          </>
        }
      />

      <GlobalKeySection
        provider="postpeer"
        hasKey={settings.hasPostpeerKey}
        hint={settings.postpeerKeyHint}
        description={
          <>
            Find your access key in the{" "}
            <a href="https://www.postpeer.dev/docs/authentication" target="_blank" rel="noreferrer" className="underline">
              PostPeer dashboard
            </a>
            . It is verified before being saved and stored encrypted.
          </>
        }
      />

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Instagram connection</h2>
          <p className="mt-1 text-sm text-muted">
            Options used when starting the Instagram login. The connection method applies to both providers; auto-login and
            business scopes only apply to bundle.social.
          </p>
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

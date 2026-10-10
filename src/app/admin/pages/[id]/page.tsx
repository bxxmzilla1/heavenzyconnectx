import Link from "next/link";
import { notFound } from "next/navigation";
import { clearPageApiKeyAction, deletePageAction, removePagePasscodeAction, resetConnectionsAction } from "@/actions/pages";
import { CopyButton } from "@/components/CopyButton";
import { getPageById, getSettings, listConnectionsForPage, pageApiKeyHint, pageProvider } from "@/lib/db";
import { PROVIDER_LABEL } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/session";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { SubmitButton } from "@/components/SubmitButton";
import { EditPageForm, PageApiKeyForm, PasscodeForm, ProviderForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function PageDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const page = await getPageById(id);
  if (!page) notFound();

  const [connections, siteUrl, settings] = await Promise.all([listConnectionsForPage(id), getSiteUrl(), getSettings()]);
  const provider = pageProvider(page);
  const providerLabel = PROVIDER_LABEL[provider];
  const keyHint = pageApiKeyHint(page, provider);
  const globalHint = provider === "postpeer" ? settings.postpeerKeyHint : settings.apiKeyHint;
  const connected = connections.filter((c) => c.status === "connected");
  const usernameList = connected
    .map((c) => c.instagram_username)
    .filter((u): u is string => Boolean(u))
    .map((u) => `@${u}`)
    .join("\n");
  const url = `${siteUrl}/${page.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-fg">
          ← All pages
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{page.title}</h1>
          <div className="flex items-center gap-2">
            <CopyButton text={url} />
            <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary">
              Open page ↗
            </a>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">{url}</p>
      </div>

      {created && <p className="alert-success">Page created. Share the link above.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Details</h2>
          <EditPageForm page={{ id: page.id, title: page.title, slug: page.slug }} siteUrl={siteUrl} />
        </section>

        <section className="card">
          <h2 className="mb-1 text-lg font-semibold">Passcode</h2>
          <p className="mb-4 text-sm text-muted">
            {page.passcode_hash
              ? "Visitors must enter a passcode before they can see the Connect button."
              : "Anyone with the link can open this page."}
          </p>
          <PasscodeForm pageId={page.id} hasPasscode={Boolean(page.passcode_hash)} />
          {page.passcode_hash && (
            <form action={removePagePasscodeAction} className="mt-3">
              <input type="hidden" name="id" value={page.id} />
              <ConfirmSubmit className="btn btn-secondary" message="Remove the passcode? Anyone with the link will be able to open the page.">
                Remove passcode
              </ConfirmSubmit>
            </form>
          )}
        </section>
      </div>

      <section className="card space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Provider &amp; API key</h2>
          <p className="mt-1 text-sm text-muted">
            {provider === "postpeer"
              ? "Connections from this page create a PostPeer profile, renamed to the Instagram username."
              : "Connections from this page create a bundle.social team, renamed to the Instagram username."}
          </p>
        </div>

        <ProviderForm pageId={page.id} provider={provider} />

        {keyHint ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
            <div className="text-sm">
              <span className="text-success">Using this page&apos;s own {providerLabel} key</span>{" "}
              <span className="font-mono text-muted">••••••••{keyHint}</span>
            </div>
            <form action={clearPageApiKeyAction}>
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="provider" value={provider} />
              <ConfirmSubmit
                className="btn btn-secondary"
                message={`Remove this page's ${providerLabel} key? The page will fall back to the global key from Settings.`}
              >
                Use global key instead
              </ConfirmSubmit>
            </form>
          </div>
        ) : globalHint ? (
          <p className="rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
            Using the global {providerLabel} key from Settings <span className="font-mono">••••••••{globalHint}</span>. Add a key
            below to use a different {providerLabel} account for this page.
          </p>
        ) : (
          <p className="alert-warn">
            No {providerLabel} key for this page and no global {providerLabel} key in Settings. The Connect button will not work
            until you add one.
          </p>
        )}
        <PageApiKeyForm key={provider} pageId={page.id} provider={provider} hasKey={Boolean(keyHint)} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Connections</h2>
          {connected.length > 0 && (
            <div className="flex items-center gap-2">
              {usernameList && (
                <CopyButton text={usernameList} label={`Copy ${connected.length} username${connected.length === 1 ? "" : "s"}`} />
              )}
              <form action={resetConnectionsAction}>
                <input type="hidden" name="id" value={page.id} />
                <SubmitButton className="btn btn-danger" pendingText="Resetting…">
                  Reset list
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
        <p className="text-sm text-muted">
          Instagram accounts connected through this page. Each one has its own bundle.social team named after the account.
        </p>
        {connected.length === 0 ? (
          <p className="card text-sm text-muted">No accounts connected yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Instagram</th>
                  <th className="px-4 py-3">Team / profile</th>
                  <th className="px-4 py-3">Connected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {connected.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.instagram_username ? `@${c.instagram_username}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div>{c.team_name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted">{c.team_id}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(c.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card border-danger/30">
        <h2 className="mb-1 text-lg font-semibold text-danger">Delete page</h2>
        <p className="mb-4 text-sm text-muted">
          Removes the page and its connection history from this app. Teams already created in bundle.social are not touched.
        </p>
        <form action={deletePageAction}>
          <input type="hidden" name="id" value={page.id} />
          <ConfirmSubmit className="btn btn-danger" message={`Delete "${page.title}"? This cannot be undone.`}>
            Delete page
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}

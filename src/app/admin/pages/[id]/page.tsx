import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePageAction, removePagePasscodeAction } from "@/actions/pages";
import { CopyButton } from "@/components/CopyButton";
import { getPageById, listConnectionsForPage } from "@/lib/db";
import { getSiteUrl } from "@/lib/session";
import type { ConnectionRow } from "@/lib/supabase";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { EditPageForm, PasscodeForm } from "./forms";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ConnectionRow["status"], string> = {
  connected: "border-success/40 bg-success/10 text-success",
  pending: "border-border text-muted",
  needs_channel: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  failed: "border-danger/40 bg-danger/10 text-danger",
};

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

  const [connections, siteUrl] = await Promise.all([listConnectionsForPage(id), getSiteUrl()]);
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Connections</h2>
        <p className="text-sm text-muted">
          Every click on the Connect button creates a bundle.social team. Once Instagram is connected the team is renamed to the
          Instagram username.
        </p>
        {connections.length === 0 ? (
          <p className="card text-sm text-muted">No connection attempts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Instagram</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {connections.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.instagram_username ? `@${c.instagram_username}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div>{c.team_name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted">{c.team_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_STYLE[c.status]}`}>{c.status.replace("_", " ")}</span>
                      {c.error_code && <div className="mt-1 font-mono text-xs text-muted">{c.error_code}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(c.created_at).toLocaleString()}</td>
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

import Link from "next/link";
import { getSettings, listPages } from "@/lib/db";
import { getSiteUrl } from "@/lib/session";
import { CopyButton } from "@/components/CopyButton";
import { CreatePageForm } from "./CreatePageForm";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [{ deleted }, pages, settings, siteUrl] = await Promise.all([searchParams, listPages(), getSettings(), getSiteUrl()]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="mt-1 text-sm text-muted">
            Each page lives at <code className="rounded bg-panel-2 px-1.5 py-0.5">{siteUrl}/&lt;slug&gt;</code> and shows a
            single Connect Instagram button.
          </p>
        </div>
      </div>

      {!settings.hasApiKey && (
        <p className="alert-warn">
          No bundle.social API key configured yet. Connect buttons will not work until you add one in{" "}
          <Link href="/admin/settings" className="underline">
            Settings
          </Link>
          .
        </p>
      )}
      {deleted && <p className="alert-success">Page deleted.</p>}

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Create a page</h2>
        <CreatePageForm siteUrl={siteUrl} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your pages</h2>
        {pages.length === 0 ? (
          <p className="card text-sm text-muted">No pages yet. Create your first one above.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">
            {pages.map((p) => {
              const url = `${siteUrl}/${p.slug}`;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/pages/${p.id}`} className="truncate font-semibold hover:underline">
                        {p.title}
                      </Link>
                      {p.passcode_hash ? (
                        <span className="badge border-accent/40 bg-accent/10 text-accent">Passcode</span>
                      ) : (
                        <span className="badge border-border text-muted">Public</span>
                      )}
                    </div>
                    <a href={url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-sm text-muted hover:text-fg">
                      {url}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">
                      {p.connected_count} connected
                    </span>
                    <CopyButton text={url} />
                    <Link href={`/admin/pages/${p.id}`} className="btn btn-secondary">
                      Manage
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

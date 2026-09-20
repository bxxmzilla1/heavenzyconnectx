"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChannelOption } from "@/lib/supabase";

export type ScreenState =
  | { kind: "idle" }
  | { kind: "connected"; username: string }
  | { kind: "error"; message: string }
  | { kind: "choose"; connectionId: string; channels: ChannelOption[] };

function InstagramIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function ConnectScreen({ slug, title, initial }: { slug: string; title: string; initial: ScreenState }) {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>(initial);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/connect/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setState({
          kind: "error",
          message:
            data.error === "not-configured"
              ? "This page is not fully set up yet. Please contact the person who sent you this link."
              : data.error ?? "Could not start the connection. Please try again.",
        });
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
      setBusy(false);
    }
  }

  async function choose(connectionId: string, channelId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/connect/choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId, channelId }),
      });
      const data = (await res.json()) as { username?: string; error?: string };
      if (!res.ok) {
        setState({ kind: "error", message: data.error ?? "Could not select that account." });
      } else {
        setState({ kind: "connected", username: data.username ?? "" });
        router.replace(`/${slug}?status=connected&u=${encodeURIComponent(data.username ?? "")}`);
      }
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setState({ kind: "idle" });
    router.replace(`/${slug}`);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(124,92,255,0.25),transparent_70%),radial-gradient(40%_40%_at_70%_80%,rgba(255,77,141,0.18),transparent_70%)]"
      />

      <p className="mb-10 text-sm font-medium uppercase tracking-[0.2em] text-muted">{title}</p>

      {state.kind === "idle" && (
        <>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="group flex h-64 w-64 flex-col items-center justify-center gap-4 rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_30px_80px_-20px_rgba(221,42,123,0.6)] transition hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60 sm:h-80 sm:w-80"
          >
            <InstagramIcon className="h-14 w-14 sm:h-16 sm:w-16" />
            <span className="text-2xl font-bold sm:text-3xl">{busy ? "Opening…" : "Connect"}</span>
            <span className="text-sm font-medium text-white/80">your Instagram</span>
          </button>
        </>
      )}

      {state.kind === "connected" && (
        <div className="card w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">You&apos;re connected</h1>
          {state.username && (
            <p className="mt-2 text-lg">
              <span className="font-semibold">@{state.username}</span> is now linked.
            </p>
          )}
          <p className="mt-2 text-sm text-muted">You can close this window.</p>
          <button type="button" onClick={reset} className="btn btn-secondary mt-6">
            Connect another account
          </button>
        </div>
      )}

      {state.kind === "error" && (
        <div className="card w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-danger">Connection failed</h1>
          <p className="mt-2 text-sm text-muted">{state.message}</p>
          <button type="button" onClick={reset} className="btn btn-primary mt-6">
            Try again
          </button>
        </div>
      )}

      {state.kind === "choose" && (
        <div className="card w-full max-w-md">
          <h1 className="text-xl font-semibold">Which Instagram account?</h1>
          <p className="mt-1 text-sm text-muted">You manage several accounts. Pick the one to connect.</p>
          <ul className="mt-5 space-y-2">
            {state.channels.map((ch) => (
              <li key={ch.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => choose(state.connectionId, ch.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3 text-left transition hover:border-accent disabled:opacity-50"
                >
                  {ch.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ch.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-muted">
                      <InstagramIcon className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{ch.username ? `@${ch.username}` : ch.name ?? ch.id}</span>
                    {ch.name && ch.username && <span className="block truncate text-sm text-muted">{ch.name}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

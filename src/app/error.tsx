"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          The server could not complete the request. This is usually a temporary database or configuration problem.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}

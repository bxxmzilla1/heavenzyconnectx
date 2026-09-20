import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The link you followed does not exist or has been removed.</p>
        <Link href="/" className="btn btn-secondary mt-6">
          Go home
        </Link>
      </div>
    </main>
  );
}

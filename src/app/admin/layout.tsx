import Link from "next/link";
import { logoutAction } from "@/actions/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-panel/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="rounded-lg px-3 py-1.5 font-semibold hover:bg-panel-2">
              Pages
            </Link>
            <Link href="/admin/settings" className="rounded-lg px-3 py-1.5 text-muted hover:bg-panel-2 hover:text-fg">
              Settings
            </Link>
          </nav>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-muted hover:text-fg">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Connect Pages" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Connect Pages</h1>
          <p className="mt-1 text-sm text-muted">Enter the admin password to continue.</p>
        </div>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { unlockPageAction } from "@/actions/public";
import { initialActionState } from "@/actions/types";
import { SubmitButton } from "@/components/SubmitButton";

export function PasscodeGate({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [state, action] = useActionState(unlockPageAction, initialActionState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">This page is protected. Enter the passcode you were given.</p>
        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input
            name="passcode"
            type="password"
            autoFocus
            required
            className="input"
            placeholder="Passcode"
            aria-label="Passcode"
            autoComplete="off"
          />
          {state.error && <p className="alert-error">{state.error}</p>}
          <SubmitButton className="btn btn-primary w-full" pendingText="Checking…">
            Continue
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}

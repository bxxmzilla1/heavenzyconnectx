import type { ActionState } from "@/actions/types";

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) return <p className="alert-error">{state.error}</p>;
  if (state.success) return <p className="alert-success">{state.success}</p>;
  return null;
}

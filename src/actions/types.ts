export type ActionState = {
  error?: string;
  success?: string;
};

export const initialActionState: ActionState = {};

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

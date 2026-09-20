/**
 * Centralised access to server-side environment variables.
 * Throws a clear error at call time (not import time) so `next build`
 * succeeds even when env vars are only provided on Vercel.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get adminPasscode() {
    return required("ADMIN_PASSCODE");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get encryptionKey() {
    return required("ENCRYPTION_KEY");
  },
  get siteUrl(): string | undefined {
    const v = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    return v ? v.replace(/\/+$/, "") : undefined;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

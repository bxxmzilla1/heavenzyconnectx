/** Route segments the app itself uses; pages may not claim them as slugs. */
export const RESERVED_SLUGS = new Set([
  "admin", "login", "logout", "api", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
  "static", "public", "assets", "vercel", "connect", "callback", "settings",
]);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normaliseSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateSlug(slug: string): string | null {
  if (!slug) return "Slug is required.";
  if (slug.length > 64) return "Slug must be 64 characters or fewer.";
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens only.";
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is reserved. Pick another slug.`;
  return null;
}

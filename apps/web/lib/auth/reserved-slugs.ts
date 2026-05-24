// From IA spec §4.2
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "blog",
  "changelog",
  "contact",
  "customers",
  "demo-request",
  "docs",
  "enterprise",
  "legal",
  "me",
  "orgs",
  "pricing",
  "proof",
  "security",
  "settings",
  "sign-in",
  "sign-up",
  "status",
  "support",
]);

export function isReservedSlug(s: string): boolean {
  return RESERVED_SLUGS.has(s.toLowerCase());
}

// slug must: start + end with [a-z0-9], contain only [a-z0-9-], 3–40 chars total
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function isValidSlugFormat(s: string): boolean {
  return SLUG_RE.test(s);
}

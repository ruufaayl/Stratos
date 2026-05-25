import { createHmac } from "crypto";

/**
 * Derive a deterministic, per-org external ID for AWS confused-deputy protection.
 *
 * The ID is derived as: HMAC-SHA256(SECRET, "org:<orgId>") truncated to 16 hex chars,
 * prefixed with "stratos-".
 *
 * IMPORTANT: The env var is read inside the function, not at module top-level.
 * Top-level reads break tests that set the env var per-test, and break
 * Storybook/Vite builds where the var is absent.
 *
 * @see https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
 */
export function externalIdForOrg(orgId: string): string {
  const SECRET = process.env.STRATOS_EXTERNAL_ID_SECRET;
  if (!SECRET) throw new Error("STRATOS_EXTERNAL_ID_SECRET env var is required");
  const mac = createHmac("sha256", SECRET).update(`org:${orgId}`).digest("hex");
  return `stratos-${mac.slice(0, 16)}`;
}

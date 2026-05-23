// One-shot DB inspector. Usage: node scripts/check-account-tier.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load DATABASE_URL from root .env.local
const envText = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of envText.split("\n")) {
  const [k, ...rest] = line.split("=");
  if (k && !k.startsWith("#") && rest.length) {
    process.env[k.trim()] ??= rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT id, clerk_user_id, name, provider, tier, stripe_customer_id, created_at
  FROM accounts
  ORDER BY created_at DESC
  LIMIT 10
`;
console.log(JSON.stringify(rows, null, 2));
console.log(`\nTotal rows: ${rows.length}`);
const pro = rows.filter((r) => r.tier === "pro");
console.log(`Pro tier rows: ${pro.length}`);

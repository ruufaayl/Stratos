import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Neon HTTP driver — serverless-friendly, no connection pool to manage.
// For long-lived workers or transactions, switch to neon-serverless WebSocket.
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export { schema };

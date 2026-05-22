import { z } from "zod";

// Centralized, typed env access. Fail fast on misconfiguration.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  ENGINE_URL: z.string().url().default("http://localhost:8000"),
  ENGINE_API_KEY: z.string().min(1).default("dev-only-change-me"),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  ENGINE_URL: process.env.ENGINE_URL,
  ENGINE_API_KEY: process.env.ENGINE_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
});

export type Env = z.infer<typeof schema>;

/**
 * PostHog server-side client.
 *
 * Use this from API routes / Server Components / Server Actions to capture
 * events from the server. Each call must be followed by `await ph.shutdown()`
 * (or we drop events on serverless cold-shutdown). The helpers here wrap that.
 */

import { PostHog } from "posthog-node";

let _server: PostHog | null = null;

function getServerClient(): PostHog | null {
  if (_server) return _server;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return null;
  _server = new PostHog(key, {
    host,
    // Serverless-friendly: flush after every call instead of batching.
    flushAt: 1,
    flushInterval: 0,
  });
  return _server;
}

/**
 * Capture a single server-side event and flush. Safe to await in serverless
 * functions — guarantees the event is sent before the function exits.
 */
export async function capture(opts: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const client = getServerClient();
  if (!client) return;
  client.capture({
    distinctId: opts.distinctId,
    event: opts.event,
    properties: opts.properties,
  });
  await client.shutdown();
  _server = null; // force re-init next call (clean per-invocation lifecycle)
}

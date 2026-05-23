/**
 * PostHog client-side singleton + lazy initialiser.
 *
 * Use the `PostHogProvider` (components/posthog-provider.tsx) at the root
 * of the React tree; this module just exposes the underlying client for
 * direct use (capture, identify, etc.) from any client component.
 */

"use client";

import posthog from "posthog-js";

let initialised = false;

export function initPostHog(): typeof posthog | null {
  if (initialised) return posthog;
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!key) {
    // Not configured — silently no-op rather than crashing the page.
    // Sign up at https://posthog.com and set NEXT_PUBLIC_POSTHOG_KEY.
    return null;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false, // we capture pageviews manually from the provider
    capture_pageleave: true,
    autocapture: true,
  });

  initialised = true;
  return posthog;
}

export { posthog };

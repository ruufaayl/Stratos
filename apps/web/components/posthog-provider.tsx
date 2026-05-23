"use client";

/**
 * PostHog provider — wraps the app, initialises the client SDK on mount,
 * and captures a $pageview event on every route change (App Router doesn't
 * fire native page-load events for client transitions).
 *
 * Also auto-identifies the signed-in Clerk user so events get tied to a
 * real person instead of an anonymous distinct_id.
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { initPostHog, posthog } from "@/lib/posthog/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();

  // Initialise once on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify the Clerk user when they sign in (or reset on sign-out)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.emailAddresses?.[0]?.emailAddress,
        name: user.fullName,
      });
    } else if (isSignedIn === false) {
      posthog.reset();
    }
  }, [isSignedIn, user]);

  // Manual pageview capture (App Router doesn't fire one automatically)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !pathname) return;
    const url =
      pathname + (searchParams?.toString() ? "?" + searchParams.toString() : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

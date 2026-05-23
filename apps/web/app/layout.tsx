import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";

import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stratos — your cloud, optimized",
  description:
    "AI-native cloud cost intelligence. Find wasted spend, in dollars, in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body>
          {/* PostHog uses useSearchParams — must be inside Suspense per
              Next.js 14 rules for client hooks that read the URL. */}
          <Suspense fallback={null}>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}

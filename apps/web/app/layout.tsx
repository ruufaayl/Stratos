import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { MotionConfig } from "framer-motion";

import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stratos — your cloud, optimized",
  description:
    "AI-native cloud cost intelligence. Find wasted spend, in dollars, in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignInUrl="/post-auth" afterSignUpUrl="/post-auth">
      <html lang="en" className={`dark ${manrope.variable} ${jetbrainsMono.variable}`}>
        <body>
          <MotionConfig reducedMotion="user">
            <Suspense fallback={null}>
              {/* PostHog uses useSearchParams — must be inside Suspense per
                  Next.js 14 rules for client hooks that read the URL. */}
              <PostHogProvider>{children}</PostHogProvider>
            </Suspense>
          </MotionConfig>
        </body>
      </html>
    </ClerkProvider>
  );
}

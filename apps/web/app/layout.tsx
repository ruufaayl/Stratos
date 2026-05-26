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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://stratos.ai"),
  title: {
    default: "Stratos — Cloud Cost Intelligence",
    template: "%s | Stratos",
  },
  description:
    "Find wasted cloud spend automatically. Stratos analyzes real AWS CloudWatch data to surface idle EC2, oversized RDS, zombie EBS, and commitment gaps — in plain English.",
  keywords: [
    "cloud cost optimization",
    "AWS cost reduction",
    "cloud waste detection",
    "EC2 rightsizing",
    "RDS idle detection",
    "cloud FinOps",
    "cloud cost management",
    "AWS cost intelligence",
  ],
  authors: [{ name: "Stratos" }],
  creator: "Stratos",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Stratos",
    title: "Stratos — Cloud Cost Intelligence",
    description:
      "Find wasted cloud spend automatically. Real AWS data, real savings, plain English.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stratos — Cloud Cost Intelligence",
    description:
      "Find wasted cloud spend automatically. Real AWS data, real savings, plain English.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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

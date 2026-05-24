import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { PLANS } from "@/lib/stripe";
import { usd } from "@/lib/utils";
import { CheckoutButton } from "@/components/billing/checkout-button";

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
            <Link href="/" className="text-text-primary font-semibold">
              Stratos
            </Link>
          </div>
          <nav className="flex items-center gap-6 text-mono-sm font-mono">
            <Link href="/proof" className="text-text-muted hover:text-text-primary">live demo</Link>
            <SignedOut>
              <Link href="/sign-in" className="text-text-muted hover:text-text-primary">sign in</Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary">dashboard</Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-text-primary">Simple pricing</h1>
          <p className="text-text-muted text-lg">
            Start with the public demo. Upgrade when you&apos;re ready to run it on your real infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free tier */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-8 space-y-6">
            <div>
              <div className="text-text-muted text-mono-sm font-mono uppercase tracking-wide">
                {PLANS.free.name}
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-semibold text-text-primary">$0</span>
                <span className="text-text-muted mb-1">/month</span>
              </div>
              <p className="mt-2 text-text-muted text-sm">{PLANS.free.description}</p>
            </div>

            <ul className="space-y-3">
              {PLANS.free.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                  <span className="text-savings-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/proof"
              className="block w-full text-center px-4 py-2.5 rounded-md border border-border-strong hover:border-text-muted text-text-primary font-medium transition-colors text-sm"
            >
              See the demo →
            </Link>
          </div>

          {/* Pro tier */}
          <div className="rounded-xl border border-intel-500/40 bg-bg-surface p-8 space-y-6 relative">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-mono bg-intel-500/20 text-intel-300 px-2 py-0.5 rounded-full">
                Popular
              </span>
            </div>

            <div>
              <div className="text-intel-300 text-mono-sm font-mono uppercase tracking-wide">
                {PLANS.pro.name}
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-semibold text-text-primary">
                  {usd(PLANS.pro.price)}
                </span>
                <span className="text-text-muted mb-1">/month</span>
              </div>
              <p className="mt-2 text-text-muted text-sm">{PLANS.pro.description}</p>
            </div>

            <ul className="space-y-3">
              {PLANS.pro.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                  <span className="text-savings-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {userId ? (
              <CheckoutButton />
            ) : (
              <Link
                href={`/sign-up?redirect_url=/pricing`}
                className="block w-full text-center px-4 py-2.5 rounded-md bg-intel-500 hover:bg-intel-600 text-text-primary font-medium transition-colors text-sm"
              >
                Get started →
              </Link>
            )}
          </div>
        </div>

        <div className="text-center text-text-faint text-sm font-mono space-y-1">
          <p>AWS read-only — Stratos never writes to your infrastructure.</p>
          <p>Cancel anytime. No questions asked.</p>
        </div>
      </div>

      <footer className="border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-mono-sm font-mono text-text-faint">
          <span>© Stratos · Global · No HQ</span>
          <span>build in public</span>
        </div>
      </footer>
    </main>
  );
}

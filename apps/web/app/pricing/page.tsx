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

        {/* ROI callout */}
        <div className="rounded-xl border border-savings-500/30 bg-savings-500/5 p-8 text-center space-y-3">
          <div className="text-savings-500 text-mono-sm font-mono uppercase tracking-wide">
            Average ROI
          </div>
          <div className="text-3xl font-semibold text-text-primary">
            Teams save <span className="text-savings-500">$18,000/mo</span> on a $50K/mo bill
          </div>
          <p className="text-text-muted max-w-lg mx-auto">
            At $199/month, Stratos pays for itself with the first idle EC2 instance it finds.
            That&apos;s a 90× return before the second finding.
          </p>
        </div>

        <div className="text-center text-text-faint text-sm font-mono space-y-1">
          <p>AWS read-only — Stratos never writes to your infrastructure.</p>
          <p>Cancel anytime. No questions asked.</p>
        </div>

        {/* Feature comparison table */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary text-center">What&apos;s included</h2>
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated">
                  <th className="text-left p-4 text-text-muted font-medium">Feature</th>
                  <th className="text-center p-4 text-text-muted font-medium">Free</th>
                  <th className="text-center p-4 text-intel-300 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {[
                  ["Public synthetic demo", true, true],
                  ["All 5 engine algorithms", true, true],
                  ["Real AWS account scan", false, true],
                  ["Multi-region EC2 + RDS + EBS + S3", false, true],
                  ["CloudWatch CPU telemetry (14-day)", false, true],
                  ["Claude AI plain-English explanations", false, true],
                  ["Weekly email digest", false, true],
                  ["CSV export", false, true],
                  ["Bulk apply / dismiss", false, true],
                  ["Unlimited scans", false, true],
                ].map(([feature, free, pro]) => (
                  <tr key={feature as string} className="bg-bg-surface hover:bg-bg-elevated transition-colors">
                    <td className="p-4 text-text-muted">{feature as string}</td>
                    <td className="p-4 text-center">
                      {free ? <span className="text-savings-500">✓</span> : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {pro ? <span className="text-savings-500">✓</span> : <span className="text-text-faint">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-text-primary text-center">Common questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "How does Stratos access my cloud?",
                a: "You create a read-only IAM cross-account role in your AWS account. Stratos assumes that role with your external ID — it can describe and list resources but has zero write permissions. We never touch your infrastructure.",
              },
              {
                q: "How accurate are the savings estimates?",
                a: "Stratos uses 14 days of real CloudWatch CPU data per instance and proprietary statistical algorithms (idle scoring, newsvendor commitment model). Our numbers are deterministic and traceable — every dollar figure links back to the metric that generated it.",
              },
              {
                q: "Is my AWS data safe?",
                a: "Yes. Telemetry is processed in-memory and findings are stored encrypted in a EU-region PostgreSQL database. We never store your IAM credentials — the assumed-role token is ephemeral and scoped to one scan.",
              },
              {
                q: "What if I don't save money?",
                a: "Cancel anytime. No contracts. If Stratos finds less than $199/month in actionable savings on your first scan, email us and we'll refund your first month.",
              },
              {
                q: "Can I use this on multiple AWS accounts?",
                a: "Multi-account support is on the roadmap for Q3 2026. Pro plan includes one AWS account today — you'll get multi-account at no extra charge when it ships.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-border-subtle rounded-xl p-6 space-y-2">
                <div className="font-medium text-text-primary">{q}</div>
                <div className="text-text-muted text-sm leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center space-y-4 py-8">
          <p className="text-text-muted">Ready to stop burning cloud budget?</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/proof" className="text-sm font-mono text-intel-300 hover:text-intel-200 transition-colors">
              Watch the live demo →
            </Link>
            <Link href="/sign-up" className="px-6 py-2.5 rounded-md bg-intel-500 hover:bg-intel-600 text-white font-medium text-sm transition-colors">
              Start saving →
            </Link>
          </div>
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

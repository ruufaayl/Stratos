import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function PrivacyPage() {
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
            <Link href="/pricing" className="text-text-muted hover:text-text-primary">pricing</Link>
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

      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-text-primary">Privacy Policy</h1>
          <p className="text-text-muted text-sm font-mono">Last updated: May 2026</p>
        </div>

        <p className="text-text-muted leading-relaxed">
          Stratos is built for engineers. We collect the minimum data necessary to provide
          cloud cost analysis and we never sell your data to third parties. This policy explains
          exactly what we collect, why, and how you can control it.
        </p>

        {/* Data we collect */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Data we collect</h2>
          <div className="space-y-6">
            <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 space-y-2">
              <h3 className="text-text-primary font-medium">AWS resource telemetry</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                When you run a scan, Stratos reads CPU utilisation metrics, instance metadata,
                and resource tags from your AWS account using a read-only IAM role. This telemetry
                is processed in-memory to generate findings and is not stored raw. Only the
                derived findings (e.g. &ldquo;instance i-abc123 is idle, estimated $340/mo
                saving&rdquo;) are persisted.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 space-y-2">
              <h3 className="text-text-primary font-medium">Account credentials</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                We store only the IAM role ARN and external ID you provide when connecting your
                AWS account. We never ask for, store, or transmit your AWS access keys or secret
                keys. The assumed-role session token is ephemeral — it is scoped to a single scan
                and expires automatically.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 space-y-2">
              <h3 className="text-text-primary font-medium">Usage data</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                We store your scan history, findings, and actions you take (dismiss, apply, export).
                This is the core product data that powers your dashboard. It is stored encrypted in
                our EU-region PostgreSQL database hosted on Neon.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 space-y-2">
              <h3 className="text-text-primary font-medium">Authentication data</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Authentication is handled entirely by Clerk. We never see your password. We store
                only the user ID and email address Clerk provides to us so we can associate your
                scans and findings with your account.
              </p>
            </div>
          </div>
        </section>

        {/* Data we don't collect */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Data we do not collect</h2>
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-6">
            <ul className="space-y-3">
              {[
                "AWS access keys or secret keys — we use read-only IAM role assumption only",
                "Actual workload data, application code, environment variables, or business logic",
                "Database contents, S3 object contents, or any payload data from your workloads",
                "Payment card numbers — billing is handled entirely by Stripe",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-text-muted">
                  <span className="text-savings-500 mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Data storage */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Data storage and security</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              Your findings and account data are stored in a PostgreSQL database hosted on Neon
              in the EU region. All data is encrypted at rest using AES-256 and in transit using
              TLS 1.3.
            </p>
            <p>
              AWS credentials (the IAM role ARN and external ID) are stored encrypted in the same
              database. The assumed-role session token Stratos uses during a scan is ephemeral —
              it is never written to disk and expires after each scan.
            </p>
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              all associated data is permanently deleted within 30 days.
            </p>
          </div>
        </section>

        {/* Third-party services */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Third-party services</h2>
          <p className="text-text-muted leading-relaxed">
            Stratos uses the following third-party services. Each has its own privacy policy
            governing how it handles your data.
          </p>
          <div className="space-y-3">
            {[
              {
                name: "Clerk",
                role: "Authentication",
                url: "https://clerk.com/privacy",
                label: "clerk.com/privacy",
              },
              {
                name: "Stripe",
                role: "Billing and payments",
                url: "https://stripe.com/privacy",
                label: "stripe.com/privacy",
              },
              {
                name: "Neon",
                role: "Database hosting (EU region)",
                url: "https://neon.tech/privacy",
                label: "neon.tech/privacy",
              },
              {
                name: "Vercel",
                role: "Web hosting",
                url: "https://vercel.com/legal/privacy-policy",
                label: "vercel.com/legal/privacy-policy",
              },
              {
                name: "PostHog",
                role: "Product analytics (self-hosted, EU region)",
                url: "https://posthog.com/privacy",
                label: "posthog.com/privacy",
              },
            ].map(({ name, role, url, label }) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-5 py-4"
              >
                <div>
                  <span className="text-text-primary font-medium text-sm">{name}</span>
                  <span className="text-text-muted text-sm ml-2">— {role}</span>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-intel-300 hover:text-intel-200 text-xs font-mono transition-colors"
                >
                  {label} →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Your rights */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Your rights</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              <span className="text-text-primary font-medium">Export your data.</span>{" "}
              Every findings page has a CSV export button. You can export all your findings and
              scan history at any time, no questions asked.
            </p>
            <p>
              <span className="text-text-primary font-medium">Delete your account.</span>{" "}
              Email{" "}
              <a
                href="mailto:privacy@stratos.ai"
                className="text-intel-300 hover:text-intel-200 transition-colors"
              >
                privacy@stratos.ai
              </a>{" "}
              and we will permanently delete your account and all associated data within 30 days.
            </p>
            <p>
              <span className="text-text-primary font-medium">No data sales.</span>{" "}
              We never sell, rent, or trade your data to third parties. Your cloud telemetry
              is used solely to provide the Stratos service to you.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-xl border border-border-subtle bg-bg-surface p-6 space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Contact</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Questions about this policy or your data? Email{" "}
            <a
              href="mailto:privacy@stratos.ai"
              className="text-intel-300 hover:text-intel-200 transition-colors"
            >
              privacy@stratos.ai
            </a>
            . We aim to respond within 2 business days.
          </p>
        </section>
      </div>

      <footer className="border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-mono-sm font-mono text-text-faint">
          <span>© Stratos · Global · No HQ</span>
          <div className="flex items-center gap-6">
            <Link href="/proof" className="hover:text-text-muted transition-colors">live demo</Link>
            <Link href="/pricing" className="hover:text-text-muted transition-colors">pricing</Link>
            <Link href="/privacy" className="hover:text-text-muted transition-colors">privacy</Link>
            <Link href="/terms" className="hover:text-text-muted transition-colors">terms</Link>
            <span>build in public</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function TermsPage() {
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
          <h1 className="text-4xl font-semibold tracking-tight text-text-primary">Terms of Service</h1>
          <p className="text-text-muted text-sm font-mono">Last updated: May 2026</p>
        </div>

        <p className="text-text-muted leading-relaxed">
          By using Stratos you agree to these terms. They are written in plain English —
          no legalese. If something is unclear, email{" "}
          <a
            href="mailto:legal@stratos.ai"
            className="text-intel-300 hover:text-intel-200 transition-colors"
          >
            legal@stratos.ai
          </a>{" "}
          and we will clarify.
        </p>

        {/* Service */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">The service</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              Stratos provides cloud cost analysis using read-only AWS access. We analyse your
              resource utilisation — EC2 CPU metrics, RDS connection counts, EBS attachment state,
              S3 storage — and surface savings opportunities, quantified in dollars.
            </p>
            <p>
              <span className="text-text-primary font-medium">We never modify your infrastructure.</span>{" "}
              Stratos holds only read permissions on your AWS account. Every finding is a
              recommendation — you decide whether and when to act on it. We are an analysis
              tool, not an automation agent.
            </p>
          </div>
        </section>

        {/* Acceptable use */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Acceptable use</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>You agree to use Stratos only for lawful purposes and in accordance with these terms.</p>
            <p>You agree not to:</p>
            <ul className="space-y-2 ml-4">
              {[
                "Attempt to reverse-engineer, decompile, or extract the underlying algorithms or engine source code",
                "Abuse the API or scan endpoints in a way that degrades service for other users",
                "Use Stratos to analyse cloud accounts you do not have authorisation to access",
                "Resell or sublicense access to the Stratos service without our written permission",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="text-border-strong mt-0.5 shrink-0">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Billing */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Billing</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              The Pro plan is billed at <span className="text-text-primary font-medium">$199/month</span>.
              Billing is handled by Stripe. You can cancel at any time from your billing portal —
              your access continues until the end of the current billing period.
            </p>
            <p>
              <span className="text-text-primary font-medium">Refund policy.</span>{" "}
              We offer refunds at our discretion within the first 30 days of your subscription if
              Stratos finds less actionable savings than the subscription cost on your first scan.
              Email{" "}
              <a
                href="mailto:legal@stratos.ai"
                className="text-intel-300 hover:text-intel-200 transition-colors"
              >
                legal@stratos.ai
              </a>{" "}
              with your scan results and we will review.
            </p>
            <p>
              We reserve the right to change pricing with 30 days notice to your registered email
              address. Price changes do not apply to the current billing period.
            </p>
          </div>
        </section>

        {/* Liability */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Liability</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              Stratos provides analysis tools, not financial or infrastructure advice. The findings
              we surface are recommendations based on historical telemetry data. You are solely
              responsible for evaluating those recommendations and for any infrastructure changes
              you make based on them.
            </p>
            <p>
              To the maximum extent permitted by applicable law, our total liability to you for
              any claims arising from your use of Stratos is limited to the fees you paid us in
              the three months immediately preceding the claim.
            </p>
            <p>
              We are not liable for any indirect, incidental, special, consequential, or punitive
              damages, including loss of profits, data, or business, arising from your use of or
              inability to use the service.
            </p>
          </div>
        </section>

        {/* Data ownership */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Your data</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              <span className="text-text-primary font-medium">You own your data.</span>{" "}
              The telemetry, findings, and account information associated with your Stratos account
              belongs to you. We do not claim ownership of it.
            </p>
            <p>
              By using Stratos, you grant us a limited, non-exclusive licence to process your data
              for the sole purpose of providing the service to you. We do not sell, share, or use
              your data for any other purpose. See our{" "}
              <Link href="/privacy" className="text-intel-300 hover:text-intel-200 transition-colors">
                Privacy Policy
              </Link>{" "}
              for full details.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Changes to these terms</h2>
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              We may update these terms from time to time. We will notify you by email at least
              30 days before any material changes take effect. Continued use of Stratos after
              the effective date constitutes acceptance of the new terms.
            </p>
            <p>
              If you do not agree with a change, you can cancel your subscription before the
              effective date and request a pro-rated refund for any unused portion of your
              current billing period.
            </p>
          </div>
        </section>

        {/* Governing law */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Governing law</h2>
          <p className="text-text-muted leading-relaxed">
            These terms are governed by the laws of the jurisdiction in which Stratos is
            incorporated. Any disputes will be resolved by binding arbitration, except where
            prohibited by applicable law. Nothing in these terms limits your statutory rights as
            a consumer.
          </p>
        </section>

        {/* Contact */}
        <section className="rounded-xl border border-border-subtle bg-bg-surface p-6 space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Contact</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Questions about these terms? Email{" "}
            <a
              href="mailto:legal@stratos.ai"
              className="text-intel-300 hover:text-intel-200 transition-colors"
            >
              legal@stratos.ai
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

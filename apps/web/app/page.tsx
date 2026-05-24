import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
            <span className="text-text-primary font-semibold">Stratos</span>
          </div>
          <nav className="flex items-center gap-6 text-mono-sm font-mono">
            <Link href="/proof" className="text-text-muted hover:text-text-primary">
              live demo
            </Link>
            <Link href="/pricing" className="text-text-muted hover:text-text-primary">
              pricing
            </Link>
            <SignedOut>
              <Link href="/sign-in" className="text-text-muted hover:text-text-primary">
                sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-intel-500 hover:bg-intel-600 text-text-primary px-3 py-1.5 rounded-md transition-colors"
              >
                connect account
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary">
                dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 text-text-muted text-mono-sm font-mono">
            <span className="size-1.5 rounded-full bg-intel-500" />
            AI-native cloud cost intelligence — built solo, in the open
          </div>
          <h1 className="text-4xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Your cloud,{" "}
            <span className="text-intel-300">optimized.</span>
            <br />
            Automatically.
          </h1>
          <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto">
            The intelligent layer above your cloud. Python computes the truth,
            Claude explains it. Every dollar this engine returns will survive
            your CFO checking it against your AWS bill.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/proof"
              className="px-6 py-3 rounded-md bg-intel-500 hover:bg-intel-600 text-text-primary font-medium transition-colors"
            >
              See it find waste in real time →
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-md border border-border-strong hover:border-text-muted text-text-primary font-medium transition-colors"
            >
              Connect your account
            </Link>
          </div>

          <div className="pt-8 text-text-faint text-mono-sm font-mono">
            engine:{" "}
            <Link
              href="/engine/health"
              className="text-intel-300 hover:text-intel-300-hover underline underline-offset-4"
            >
              /engine/health
            </Link>
            {"  ·  "}
            no waitlist · no slideshow · real working code
          </div>
        </div>
      </section>

      {/* Architecture strip */}
      <section className="border-t border-border-subtle bg-bg-surface/30">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-text-primary font-medium mb-2">Five algorithms</div>
            <div className="text-text-muted">
              Geometric-mean idle detection. p95-headroom rightsizing.
              EWMA anomaly bands. Newsvendor commitment optimum. Holt-Winters
              forecast with √t bands.
            </div>
          </div>
          <div>
            <div className="text-text-primary font-medium mb-2">Truth is sacred</div>
            <div className="text-text-muted">
              The LLM never computes a number. Python owns the math; Claude
              writes the prose. Every figure traces back to a deterministic
              calculation you can audit.
            </div>
          </div>
          <div>
            <div className="text-text-primary font-medium mb-2">Real data, real dollars</div>
            <div className="text-text-muted">
              Proven against millions of real public-cloud VM traces. AWS
              read-only, always — Stratos never writes to your infrastructure
              without your one-click approval.
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-mono-sm font-mono text-text-faint">
          <span>© Stratos · Global · No HQ</span>
          <span>build in public</span>
        </div>
      </footer>
    </main>
  );
}

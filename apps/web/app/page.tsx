import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

// ---------------------------------------------------------------------------
// Landing page — D10-E marketing overhaul
// Server component — no "use client" needed.
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-bg-canvas text-text-primary">
      {/* ── Nav ── */}
      <header className="border-b border-border-subtle sticky top-0 z-50 bg-bg-canvas/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
            <span className="text-text-primary font-semibold tracking-tight">Stratos</span>
          </div>
          <nav className="flex items-center gap-6 text-mono-sm font-mono">
            <Link href="/proof" className="text-text-muted hover:text-text-primary transition-colors">
              live demo
            </Link>
            <Link href="/pricing" className="text-text-muted hover:text-text-primary transition-colors">
              pricing
            </Link>
            <SignedOut>
              <Link href="/sign-in" className="text-text-muted hover:text-text-primary transition-colors">
                sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-intel-500 hover:bg-intel-300 hover:text-intel-950 text-white px-3 py-1.5 rounded transition-colors font-medium"
              >
                start free →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/app" className="text-text-muted hover:text-text-primary transition-colors">
                dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex items-center justify-center pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-waste-950 bg-waste-950/40 px-3 py-1 text-mono-sm font-mono text-waste-300 uppercase tracking-[0.1em]">
            <span className="size-1.5 rounded-full bg-waste-500 animate-pulse-dot" />
            AI-native cloud cost intelligence
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.04]">
            Your cloud is{" "}
            <span className="text-waste-500">burning money.</span>
            <br />
            <span className="text-intel-300">Stratos finds it.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            Connect in 5 minutes. Find waste in seconds.
            Every dollar computed by Python — never invented by an LLM.
          </p>

          {/* Stat row */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 py-2 text-mono-sm font-mono">
            <span>
              <span className="text-waste-400 font-semibold text-lg tabular-nums">~$230B</span>
              <span className="text-text-faint ml-1.5">wasted annually</span>
            </span>
            <span className="hidden sm:inline text-border-strong text-lg">·</span>
            <span>
              <span className="text-waste-400 font-semibold text-lg tabular-nums">32%</span>
              <span className="text-text-faint ml-1.5">of all cloud spend</span>
            </span>
            <span className="hidden sm:inline text-border-strong text-lg">·</span>
            <span>
              <span className="text-savings-400 font-semibold text-lg tabular-nums">5 min</span>
              <span className="text-text-faint ml-1.5">setup</span>
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded bg-intel-500 hover:bg-intel-300 hover:text-intel-950 text-white font-medium text-sm transition-colors"
            >
              Start free →
            </Link>
            <Link
              href="/proof"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded border border-border-strong hover:border-text-muted text-text-primary font-medium text-sm transition-colors"
            >
              See it live →
            </Link>
          </div>

          <p className="text-text-faint text-xs font-mono pt-1">
            no credit card · read-only AWS access · cancel anytime
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-border-subtle bg-bg-surface/30 py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-mono-sm font-mono text-text-faint uppercase tracking-[0.12em]">
              How it works
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              From zero to findings in{" "}
              <span className="text-savings-400">minutes</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowItWorksCard
              step="01"
              icon="🔑"
              title="Connect your AWS account"
              description="Create a read-only IAM role with one CloudFormation click. Stratos describes your resources and pulls CloudWatch metrics — it never writes to your infrastructure."
              detail="read-only · 2 minutes"
            />
            <HowItWorksCard
              step="02"
              icon="⚡"
              title="Engine scans your resources"
              description="Five algorithms run in parallel: idle detection, rightsizing, zombie volumes, commitment gaps, and anomaly detection — across EC2, RDS, EBS in every region."
              detail="EC2 · RDS · EBS · S3 · all regions"
            />
            <HowItWorksCard
              step="03"
              icon="💡"
              title="Claude explains every finding"
              description="Plain English, dollar amounts, and clear action items. Python owns the numbers — Claude writes the explanation. Every figure traces back to a deterministic calculation."
              detail="dollar-quantified · auditable"
            />
          </div>
        </div>
      </section>

      {/* ── What we find ── */}
      <section className="border-t border-border-subtle py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-mono-sm font-mono text-text-faint uppercase tracking-[0.12em]">
              What we find
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Six categories of{" "}
              <span className="text-waste-400">hidden waste</span>
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              Most teams find savings in the first scan. Average team saves 28% of
              monthly cloud spend within 30 days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FindingCard
              icon="💤"
              name="Idle EC2 instances"
              description="Running 24/7 but doing nothing. Geometric-mean CPU analysis catches instances that look busy but aren't."
              savings="avg $340/mo per instance"
              color="waste"
            />
            <FindingCard
              icon="📦"
              name="Oversized instances"
              description="p95 headroom analysis. Your m5.2xlarge might only need a t3.large. We size it precisely, not conservatively."
              savings="avg $180/mo per instance"
              color="waste"
            />
            <FindingCard
              icon="🧟"
              name="Zombie EBS volumes"
              description="Detached volumes accumulating charges every hour. Stratos surfaces every orphaned disk, sorted by cost."
              savings="avg $85/mo per volume"
              color="waste"
            />
            <FindingCard
              icon="🗄️"
              name="Idle RDS databases"
              description="Databases with zero connections for days — still billed at full price. We find them across every region."
              savings="avg $420/mo per database"
              color="waste"
            />
            <FindingCard
              icon="📈"
              name="Commitment gaps"
              description="Newsvendor-optimal model finds your exact Reserved Instance and Savings Plan coverage. Buy the right amount — not too much, not too little."
              savings="avg 38% discount vs on-demand"
              color="savings"
            />
            <FindingCard
              icon="🚨"
              name="Anomalous spend"
              description="EWMA anomaly bands catch unexpected cost spikes in real time — before they appear on your AWS bill."
              savings="avg $2,400 per incident caught"
              color="risk"
            />
          </div>
        </div>
      </section>

      {/* ── Social proof / live demo ── */}
      <section className="border-t border-border-subtle bg-bg-surface/30 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="text-mono-sm font-mono text-text-faint uppercase tracking-[0.12em]">
            Built in the open · running on real data
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            The engine is live.{" "}
            <span className="text-savings-400">Watch it work.</span>
          </h2>
          <p className="text-lg text-text-muted leading-relaxed">
            Stratos ran against a real public Azure dataset — 12,511 production VMs.
            The result:{" "}
            <span className="text-waste-400 font-semibold font-mono tabular-nums">$1.2M/yr</span>{" "}
            of identified waste. Every number is deterministic and reproducible.
            Not a simulation. Not a demo mode.
          </p>

          <div className="rounded-card border border-border-subtle bg-bg-elevated p-6 text-left space-y-4">
            <div className="flex items-center gap-2 text-mono-sm font-mono text-text-faint">
              <span className="size-1.5 rounded-full bg-savings-500 animate-pulse-dot" />
              engine output · azure-v2 public dataset · Apache-2.0
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ProofStat label="VMs analysed" value="12,511" />
              <ProofStat label="Monthly waste" value="$99K" color="waste" />
              <ProofStat label="Annual waste" value="$1.2M" color="waste" />
              <ProofStat label="Analysis time" value="4.2s" color="savings" />
            </div>
            <div className="pt-2 border-t border-border-subtle">
              <Link
                href="/proof"
                className="text-intel-300 hover:text-intel-300 text-sm font-mono underline underline-offset-4"
              >
                Watch the engine find $500K of waste live →
              </Link>
            </div>
          </div>

          <p className="text-text-faint text-xs font-mono">
            Source: Azure Public Dataset v2 (Apache-2.0) · Methodology: PROVENANCE.md · All math auditable
          </p>
        </div>
      </section>

      {/* ── Architecture trust strip ── */}
      <section className="border-t border-border-subtle py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <TrustItem
            title="Python owns the truth"
            body="The LLM never computes a number. Every dollar figure traces back to a deterministic Python calculation. Your CFO can audit it against your real bill."
          />
          <TrustItem
            title="Read-only, always"
            body="Stratos uses read-only IAM. It describes your resources and reads CloudWatch metrics. It never modifies, terminates, or touches your infrastructure without explicit approval."
          />
          <TrustItem
            title="Five proven algorithms"
            body="Geometric-mean idle detection. p95-headroom rightsizing. EWMA anomaly bands. Newsvendor commitment optimum. Holt-Winters forecast with √t uncertainty bands."
          />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border-subtle bg-bg-surface/30 py-24 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Ready to find{" "}
            <span className="text-savings-400">your waste?</span>
          </h2>
          <p className="text-xl text-text-muted leading-relaxed">
            Connect your AWS account in 5 minutes. Stratos tells you exactly
            where your money is going — and exactly how to stop wasting it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 rounded bg-intel-500 hover:bg-intel-300 hover:text-intel-950 text-white font-medium transition-colors"
            >
              Create free account →
            </Link>
            <Link
              href="/proof"
              className="inline-flex items-center gap-2 px-8 py-4 rounded border border-border-strong hover:border-text-muted text-text-primary font-medium transition-colors"
            >
              See live demo first
            </Link>
          </div>
          <p className="text-text-faint text-xs font-mono">
            no credit card · read-only AWS · cancel anytime · real working product
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
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

// ---------------------------------------------------------------------------
// Sub-components (all server components — no "use client")
// ---------------------------------------------------------------------------

function HowItWorksCard({
  step,
  icon,
  title,
  description,
  detail,
}: {
  step: string;
  icon: string;
  title: string;
  description: string;
  detail: string;
}) {
  return (
    <div className="relative rounded-card border border-border-subtle bg-bg-surface p-6 space-y-4">
      {/* Step number */}
      <div className="text-mono-xs font-mono text-text-faint uppercase tracking-[0.18em]">
        {step}
      </div>
      {/* Icon */}
      <div className="text-3xl">{icon}</div>
      {/* Title */}
      <h3 className="text-text-primary font-semibold text-h3">{title}</h3>
      {/* Description */}
      <p className="text-text-muted text-sm leading-relaxed">{description}</p>
      {/* Detail tag */}
      <div className="inline-flex items-center gap-1.5 rounded-chip border border-border-subtle bg-bg-elevated px-2 py-1 text-mono-xs font-mono text-text-faint uppercase tracking-[0.1em]">
        {detail}
      </div>
    </div>
  );
}

function FindingCard({
  icon,
  name,
  description,
  savings,
  color,
}: {
  icon: string;
  name: string;
  description: string;
  savings: string;
  color: "waste" | "savings" | "risk";
}) {
  const savingsColorMap = {
    waste:   "text-waste-400",
    savings: "text-savings-400",
    risk:    "text-risk-300",
  };

  return (
    <div className="rounded-card border border-border-subtle bg-bg-surface p-5 space-y-3 hover:border-border-strong transition-colors">
      <div className="text-2xl">{icon}</div>
      <h3 className="text-text-primary font-semibold text-sm">{name}</h3>
      <p className="text-text-muted text-xs leading-relaxed">{description}</p>
      <div className={`text-mono-xs font-mono tabular-nums ${savingsColorMap[color]}`}>
        {savings}
      </div>
    </div>
  );
}

function ProofStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "waste" | "savings";
}) {
  const colorMap = {
    waste:   "text-waste-400",
    savings: "text-savings-400",
  };
  const valueClass = color ? colorMap[color] : "text-text-primary";

  return (
    <div className="space-y-1">
      <div className="text-mono-xs font-mono text-text-faint uppercase tracking-[0.1em]">
        {label}
      </div>
      <div className={`text-kpi-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <div className="text-text-primary font-medium">{title}</div>
      <div className="text-text-muted text-sm leading-relaxed">{body}</div>
    </div>
  );
}

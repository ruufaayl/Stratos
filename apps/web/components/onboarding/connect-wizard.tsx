"use client";

/**
 * ConnectWizard — 4-step AWS account connection flow.
 *
 * Step 1: Name your account
 * Step 2: Create the IAM role (CloudFormation one-click or manual)
 * Step 3: Paste the role ARN
 * Step 4: Verifying…  → success → redirect to /dashboard
 *
 * The wizard calls POST /api/accounts on submit. If the backend validates
 * the role successfully, it redirects to the dashboard.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ConnectWizardProps {
  externalId: string;
  stratosPrincipal: string;
}

const STEPS = ["Name", "Create role", "Verify", "Done"] as const;

type Step = 0 | 1 | 2 | 3;

export function ConnectWizard({ externalId, stratosPrincipal }: ConnectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [accountName, setAccountName] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awsAccountId, setAwsAccountId] = useState<string | null>(null);

  const cfnUrl = `https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=StratosReadOnly&templateURL=https%3A%2F%2Fstratos-cfn.s3.amazonaws.com%2Fstratos-readonly-role.json&param_ExternalId=${externalId}&param_StratosPrincipal=${encodeURIComponent(stratosPrincipal)}`;

  const iamPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "rds:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}`;

  const trustPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "${stratosPrincipal}" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "${externalId}"
        }
      }
    }
  ]
}`;

  async function handleVerify() {
    if (!roleArn.trim()) {
      setError("Role ARN is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: accountName, roleArn: roleArn.trim(), externalId, region }),
      });
      const data = await res.json() as { message?: string; error?: string; awsAccountId?: string };
      if (!res.ok) {
        setError(data.error ?? "Verification failed. Check the role ARN and try again.");
        setLoading(false);
        return;
      }
      setAwsAccountId(data.awsAccountId ?? null);
      setStep(3);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Step progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={`flex items-center justify-center size-7 rounded-full text-xs font-mono border transition-colors ${
                i < step
                  ? "bg-good/20 border-good text-good"
                  : i === step
                  ? "bg-brand/20 border-brand text-brand"
                  : "bg-transparent border-border-strong text-fg-subtle"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`mx-2 text-xs font-mono ${
                i === step ? "text-fg" : "text-fg-subtle"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 mr-2 ${i < step ? "bg-good/40" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Name */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Name your account</h2>
          <p className="text-fg-muted text-sm">
            Give this connection a memorable name — usually your AWS account alias
            or environment (e.g., "acme-prod", "staging").
          </p>
          <div className="space-y-2">
            <label className="text-sm text-fg-muted font-mono">Account name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="acme-prod"
              className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-intel-500 text-fg font-mono text-sm"
            />
          </div>
          <button
            disabled={!accountName.trim()}
            onClick={() => setStep(1)}
            className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-50 text-fg font-medium text-sm"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 1 — Create role */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-fg">Create the IAM role</h2>
          <p className="text-fg-muted text-sm">
            Create a read-only IAM role in your AWS account that Stratos can assume.
            Choose one-click CloudFormation or manual setup.
          </p>

          {/* One-click option */}
          <div className="rounded-lg border border-brand/30 bg-bg-raised p-5 space-y-3">
            <div className="text-fg font-medium text-sm">Option A — One-click CloudFormation</div>
            <p className="text-fg-muted text-xs">
              Launches a CloudFormation stack that creates the role with the correct
              policy and trust relationship pre-configured.
            </p>
            <a
              href={cfnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-fg font-medium text-sm"
            >
              Launch in CloudFormation →
            </a>
            <p className="text-fg-subtle text-xs font-mono">
              External ID: <span className="text-fg">{externalId}</span>
            </p>
          </div>

          {/* Manual option */}
          <details className="rounded-lg border border-border bg-bg-raised">
            <summary className="px-5 py-4 text-sm text-fg-muted cursor-pointer hover:text-fg">
              Option B — Manual IAM setup
            </summary>
            <div className="px-5 pb-5 space-y-4">
              <div>
                <p className="text-fg-muted text-xs mb-2">1. Create a new IAM role with this trust policy:</p>
                <pre className="bg-bg-subtle rounded p-3 text-xs font-mono text-fg-muted overflow-x-auto">{trustPolicy}</pre>
              </div>
              <div>
                <p className="text-fg-muted text-xs mb-2">2. Attach this inline policy:</p>
                <pre className="bg-bg-subtle rounded p-3 text-xs font-mono text-fg-muted overflow-x-auto">{iamPolicy}</pre>
              </div>
            </div>
          </details>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 rounded-md border border-border text-fg-muted hover:text-fg text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-fg font-medium text-sm"
            >
              I&apos;ve created the role →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Enter ARN */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Enter the role ARN</h2>
          <p className="text-fg-muted text-sm">
            Copy the role ARN from the CloudFormation output or the IAM console.
          </p>
          <div className="space-y-2">
            <label className="text-sm text-fg-muted font-mono">Role ARN</label>
            <input
              type="text"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/StratosReadOnly"
              className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-intel-500 text-fg font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-fg-muted font-mono">Primary region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-intel-500 text-fg font-mono text-sm"
            >
              {["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {error && (
            <div className="rounded-md bg-bad/10 border border-bad/30 px-4 py-3 text-bad text-sm font-mono">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-md border border-border text-fg-muted hover:text-fg text-sm"
            >
              ← Back
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || !roleArn.trim()}
              className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-wait text-fg font-medium text-sm"
            >
              {loading ? "Verifying…" : "Verify & Connect →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="size-8 flex items-center justify-center rounded-full bg-good/20 text-good text-lg">✓</span>
            <h2 className="text-lg font-medium text-fg">Connected!</h2>
          </div>
          <p className="text-fg-muted text-sm">
            Stratos has successfully assumed your IAM role
            {awsAccountId && ` on AWS account ${awsAccountId}`}.
            Your first analysis will run shortly.
          </p>
          <div className="rounded-lg border border-good/30 bg-good/5 p-4 text-sm font-mono text-fg-muted">
            <div>Account: <span className="text-fg">{accountName}</span></div>
            {awsAccountId && <div>AWS ID: <span className="text-fg">{awsAccountId}</span></div>}
            <div>Permissions: <span className="text-good">read-only ✓</span></div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-fg font-medium text-sm"
          >
            Go to dashboard →
          </button>
        </div>
      )}
    </div>
  );
}

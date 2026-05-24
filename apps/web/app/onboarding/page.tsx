import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { ConnectWizard } from "@/components/onboarding/connect-wizard";
import { generateExternalId } from "@/lib/aws/connect";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/onboarding");

  // Generate a per-session external ID. In a real flow this would be persisted
  // to the DB before the page renders so the CloudFormation template can embed
  // it. For now we generate it server-side and pass it to the wizard.
  const externalId = generateExternalId();

  // The ARN of the Stratos IAM principal users need to trust.
  // In prod this is our AWS account. In dev it's a placeholder.
  const stratosPrincipal =
    process.env.STRATOS_AWS_PRINCIPAL ?? "arn:aws:iam::000000000000:root";

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
            <Link href="/" className="text-text-primary font-semibold">
              Stratos
            </Link>
            <span className="text-text-faint text-mono-sm font-mono">/ connect</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-semibold text-text-primary">Connect your AWS account</h1>
          <p className="text-text-muted">
            Read-only setup. Stratos never writes to your infrastructure.
            Takes under 10 minutes via a cross-account IAM role.
          </p>
        </div>

        <ConnectWizard
          externalId={externalId}
          stratosPrincipal={stratosPrincipal}
        />
      </div>
    </main>
  );
}

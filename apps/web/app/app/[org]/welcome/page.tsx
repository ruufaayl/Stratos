import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CloudCard } from "@/components/welcome/cloud-card";

export default async function WelcomePage({
  params,
}: {
  params: { org: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}/welcome`);

  const accounts = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  // If org already has at least one account, skip welcome
  if (accounts.length > 0) redirect(`/app/${params.org}`);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-mono-sm font-mono text-text-faint mb-2">
        STRATOS · WELCOME
      </div>
      <h1 className="text-h2 text-text-primary mb-3">
        Let&apos;s connect your first cloud.
      </h1>
      <p className="text-text-muted mb-12 max-w-2xl">
        Stratos analyzes read-only billing + telemetry to find $-quantified
        waste in your cloud. Connect an account to start your first scan.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <CloudCard
          cloud="aws"
          status="available"
          href={`/app/${params.org}/integrations/connect/aws`}
        />
        <CloudCard cloud="azure" status="coming-soon" href="#" />
        <CloudCard cloud="gcp" status="coming-soon" href="#" />
      </div>
      <p className="text-text-faint text-mono-sm font-mono mt-12">
        You can connect more clouds later in Integrations.
      </p>
    </div>
  );
}

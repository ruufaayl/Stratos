import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ConnectAwsWizard } from "@/components/integrations/connect-aws/connect-aws-wizard";
import { externalIdForOrg } from "@/lib/aws/external-id";
import { Empty } from "@/components/ui/empty";

export default async function ConnectAwsPage({ params }: { params: { org: string } }) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) redirect(`/sign-in?return_to=/app/${params.org}/integrations/connect/aws`);
  if (!orgId) redirect(`/orgs?error=not-member`);

  // Admin gate
  const role = orgRole?.replace("org:", "") ?? "member";
  if (role !== "owner" && role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Empty
          title="Admin role required"
          body="Only owners and admins can connect AWS accounts. Ask an admin in your organization to set this up."
        />
      </div>
    );
  }

  const externalId = externalIdForOrg(orgId);
  const stratosPrincipal =
    process.env.STRATOS_AWS_PRINCIPAL_ARN ??
    "arn:aws:iam::000000000000:role/StratosCrossAccountAssumer-PLACEHOLDER";

  return (
    <ConnectAwsWizard
      externalId={externalId}
      stratosPrincipal={stratosPrincipal}
      orgSlug={params.org}
    />
  );
}

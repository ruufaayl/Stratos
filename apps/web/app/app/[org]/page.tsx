import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export default async function OrgRoot({
  params,
}: {
  params: { org: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}`);

  const accounts = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  // No connected accounts yet — send to the welcome wizard
  if (accounts.length === 0) redirect(`/app/${params.org}/welcome`);

  return (
    <div className="p-8">
      <div className="text-text-faint text-mono-sm font-mono mb-2">
        SHELL · READY
      </div>
      <h1 className="text-h2 text-text-primary">Shell mounted</h1>
      <p className="text-text-muted mt-2">
        Sub-project C complete. Next: wave 1 — sign-up → org-create → welcome
        wizard → first finding.
      </p>
    </div>
  );
}

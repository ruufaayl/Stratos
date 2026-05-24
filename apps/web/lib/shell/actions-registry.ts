// apps/web/lib/shell/actions-registry.ts
import type { Role } from "./org-context";

export type ActionDef = {
  id: string;
  label: string;
  category: "Actions" | "Help";
  requiresRole?: Role;        // undefined = any role
  /** Pure-data href OR a key the command bar resolves to a callback. */
  href?: (orgSlug: string) => string;
  callbackKey?: "openConnectWizard" | "signOut" | "switchOrg";
};

export const actions: readonly ActionDef[] = [
  { id: "invite",           label: "Invite member",          category: "Actions", requiresRole: "admin", href: (o) => `/app/${o}/settings/members/invite` },
  { id: "connect-aws",      label: "Connect AWS account",    category: "Actions", requiresRole: "admin", href: (o) => `/app/${o}/integrations/connect/aws` },
  { id: "connect-azure",    label: "Connect Azure account",  category: "Actions", requiresRole: "admin", href: (o) => `/app/${o}/integrations/connect/azure` },
  { id: "connect-gcp",      label: "Connect GCP account",    category: "Actions", requiresRole: "admin", href: (o) => `/app/${o}/integrations/connect/gcp` },
  { id: "create-report",    label: "Create report",          category: "Actions",                       href: (o) => `/app/${o}/reports/custom` },
  { id: "billing",          label: "Manage billing",         category: "Actions", requiresRole: "owner", href: (o) => `/app/${o}/settings/billing` },
  { id: "sign-out",         label: "Sign out",               category: "Actions", callbackKey: "signOut" },
  { id: "docs-rightsizing", label: "Docs · rightsizing",     category: "Help",                          href: () => "/docs/algorithms#rightsizing" },
  { id: "docs-anomaly",     label: "Docs · anomaly detection",category: "Help",                         href: () => "/docs/algorithms#anomaly" },
  { id: "docs-security",    label: "Docs · security model",  category: "Help",                          href: () => "/docs/security" },
] as const;

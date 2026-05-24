// apps/web/lib/shell/breadcrumb-registry.ts
/**
 * Maps a single pathname segment (no leading slash) to a human label.
 * Unknown segments fall back to the segment with first-letter-capitalized.
 */
const LABELS: Record<string, string> = {
  app: "App",
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  findings: "Findings",
  forecast: "Forecast",
  reports: "Reports",
  integrations: "Integrations",
  settings: "Settings",
  general: "General",
  members: "Members",
  invite: "Invite",
  roles: "Roles",
  sso: "SSO",
  "audit-log": "Audit log",
  billing: "Billing",
  plan: "Plan",
  usage: "Usage",
  invoices: "Invoices",
  notifications: "Notifications",
  "data-retention": "Data retention",
  danger: "Danger zone",
  welcome: "Welcome",
  connect: "Connect",
  accounts: "Accounts",
  regions: "Regions",
  services: "Services",
  resources: "Resources",
  saved: "Saved",
  archived: "Archived",
  scenarios: "Scenarios",
  budgets: "Budgets",
  monthly: "Monthly",
  executive: "Executive",
  custom: "Custom",
  scheduled: "Scheduled",
  webhooks: "Webhooks",
  "api-keys": "API keys",
  slack: "Slack",
  jira: "Jira",
  pagerduty: "PagerDuty",
};

export function labelForSegment(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

// apps/web/components/shell/command-bar-source.ts
import { primaryNav, settingsNav } from "@/lib/shell/nav-registry";
import { actions as registryActions } from "@/lib/shell/actions-registry";
import type { Role } from "@/lib/shell/org-context";

export type CommandResult = {
  id: string;
  category:
    | "Recent"
    | "Navigate"
    | "Actions"
    | "Saved"
    | "Resources"
    | "Findings"
    | "Help";
  label: string;
  hint?: string;
  href?: string;
  onSelect?: () => void;
  score: number;
};

const CATEGORY_ORDER: CommandResult["category"][] = [
  "Recent",
  "Navigate",
  "Actions",
  "Saved",
  "Resources",
  "Findings",
  "Help",
];

/**
 * Simple fuzzy match: prefix > substring > no match.
 * score = prefixHit ? 1 : substringHit ? 0.6 : 0
 */
function fuzzyScore(label: string, query: string): number {
  if (!query) return 0.5; // no query → show everything at base score
  const lower = label.toLowerCase();
  const q = query.toLowerCase();
  if (lower.startsWith(q)) return 1;
  if (lower.includes(q)) return 0.6;
  return 0;
}

/**
 * Role hierarchy: owner > admin > member
 */
function roleAllowed(required: Role | undefined, userRole: Role): boolean {
  if (!required) return true;
  const levels: Record<Role, number> = { owner: 3, admin: 2, member: 1 };
  return levels[userRole] >= levels[required];
}

/**
 * Build an ID for a nav item that can be stored in recent list.
 */
function navId(key: string): string {
  return `nav-${key}`;
}

/**
 * Build all navigate results from the nav registry.
 */
function buildNavigateResults(
  orgSlug: string,
  query: string,
): CommandResult[] {
  const all = [...primaryNav, settingsNav];
  return all
    .map((item) => ({
      id: navId(item.key),
      category: "Navigate" as const,
      label: item.label,
      href: item.href(orgSlug),
      score: fuzzyScore(item.label, query),
    }))
    .filter((r) => r.score > 0);
}

/**
 * Build action results from the actions registry, filtered by role.
 */
function buildActionResults(
  orgSlug: string,
  role: Role,
  query: string,
): CommandResult[] {
  return registryActions
    .filter(
      (a) => a.category === "Actions" && roleAllowed(a.requiresRole, role),
    )
    .map((a) => ({
      id: a.id,
      category: "Actions" as const,
      label: a.label,
      href: a.href ? a.href(orgSlug) : undefined,
      // Callback actions: onSelect is a no-op until AppShell wires the callbacks
      onSelect: a.callbackKey
        ? () => {
            console.warn(
              `[CommandBar] Callback action "${a.callbackKey}" not yet wired. Wire in AppShell.`,
            );
          }
        : undefined,
      score: fuzzyScore(a.label, query),
    }))
    .filter((r) => r.score > 0);
}

/**
 * Build help results from the actions registry.
 */
function buildHelpResults(orgSlug: string, query: string): CommandResult[] {
  return registryActions
    .filter((a) => a.category === "Help")
    .map((a) => ({
      id: a.id,
      category: "Help" as const,
      label: a.label,
      href: a.href ? a.href(orgSlug) : undefined,
      score: fuzzyScore(a.label, query),
    }))
    .filter((r) => r.score > 0);
}

/**
 * Build recent results by resolving stored IDs against known nav items.
 * Max 5, only items that still exist in the nav registry.
 */
function buildRecentResults(
  orgSlug: string,
  recentIds: string[],
  query: string,
): CommandResult[] {
  const all = [...primaryNav, settingsNav];
  const navMap = new Map(all.map((item) => [navId(item.key), item]));

  return recentIds
    .slice(0, 5)
    .map((id) => {
      const item = navMap.get(id);
      if (!item) return null;
      const score = fuzzyScore(item.label, query);
      if (score === 0 && query) return null;
      return {
        id,
        category: "Recent" as const,
        label: item.label,
        href: item.href(orgSlug),
        score: query ? score : 0.5,
      };
    })
    .filter((r): r is CommandResult => r !== null);
}

export function buildSync(args: {
  orgSlug: string;
  role: Role;
  pathname: string;
  query: string;
  recentIds: string[];
}): CommandResult[] {
  const { orgSlug, role, query, recentIds } = args;

  const recent = buildRecentResults(orgSlug, recentIds, query);
  const navigate = buildNavigateResults(orgSlug, query);
  const actionItems = buildActionResults(orgSlug, role, query);
  const help = buildHelpResults(orgSlug, query);

  // Combine all, sort by category order then score descending
  const all = [...recent, ...navigate, ...actionItems, ...help];

  all.sort((a, b) => {
    const catDiff =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return b.score - a.score;
  });

  return all;
}

/**
 * localStorage key for recent command bar items.
 */
export function recentStorageKey(orgId: string): string {
  return `stratos.commandBar.recent.${orgId}`;
}

/**
 * Read recent IDs from localStorage.
 */
export function getRecentIds(orgId: string): string[] {
  try {
    const raw = localStorage.getItem(recentStorageKey(orgId));
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Append an item ID to the recent list (max 5), persisting to localStorage.
 */
export function appendRecent(orgId: string, itemId: string): void {
  const current = getRecentIds(orgId);
  const updated = [itemId, ...current.filter((id) => id !== itemId)].slice(
    0,
    5,
  );
  try {
    localStorage.setItem(recentStorageKey(orgId), JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Async fetch wrappers — implemented in Task 15.
 * Declared here for import convenience.
 */
export async function fetchResources(
  orgSlug: string,
  q: string,
  signal: AbortSignal,
): Promise<CommandResult[]> {
  const res = await fetch(
    `/api/resources/search?org=${encodeURIComponent(orgSlug)}&q=${encodeURIComponent(q)}`,
    { signal },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results: CommandResult[] };
  return data.results ?? [];
}

export async function fetchFindings(
  orgSlug: string,
  q: string,
  signal: AbortSignal,
): Promise<CommandResult[]> {
  const res = await fetch(
    `/api/findings/search?org=${encodeURIComponent(orgSlug)}&q=${encodeURIComponent(q)}`,
    { signal },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results: CommandResult[] };
  return data.results ?? [];
}

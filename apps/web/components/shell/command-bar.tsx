"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname } from "next/navigation";
import { Modal, ModalContent } from "@/components/ui/modal";
import { useCommandBar } from "@/lib/shell/command-bar-context";
import { useOrg } from "@/lib/shell/org-context";
import {
  buildSync,
  fetchResources,
  fetchFindings,
  getRecentIds,
  appendRecent,
  type CommandResult,
} from "./command-bar-source";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Simple debounce hook: returns a value that only updates after `delay` ms of inactivity. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function CommandBar() {
  const { open, closeBar, query, setQuery } = useCommandBar();
  const { org, role } = useOrg();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Async results state
  const [asyncResults, setAsyncResults] = React.useState<CommandResult[]>([]);
  const debouncedQuery = useDebouncedValue(query, 200);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      // Clear async results when closed
      setAsyncResults([]);
    }
  }, [open]);

  // Fire async fetches when debounced query is >= 3 chars
  React.useEffect(() => {
    if (!open || debouncedQuery.length < 3) {
      setAsyncResults([]);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    Promise.all([
      fetchResources(org.slug, debouncedQuery, controller.signal),
      fetchFindings(org.slug, debouncedQuery, controller.signal),
    ])
      .then(([resources, findings]) => {
        if (!controller.signal.aborted) {
          setAsyncResults([...resources, ...findings]);
        }
      })
      .catch(() => {
        // AbortError or network error — silently ignore
      });

    return () => {
      controller.abort();
    };
  }, [open, debouncedQuery, org.slug]);

  const recentIds = React.useMemo(
    () => getRecentIds(org.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [org.id, open],
  );

  const syncResults = React.useMemo(
    () =>
      buildSync({
        orgSlug: org.slug,
        role,
        pathname,
        query,
        recentIds,
      }),
    [org.slug, role, pathname, query, recentIds],
  );

  // Merge: async results override/supplement sync results for Resources + Findings categories
  const allResults = React.useMemo(() => {
    const syncWithoutAsync = syncResults.filter(
      (r) => r.category !== "Resources" && r.category !== "Findings",
    );
    return [...syncWithoutAsync, ...asyncResults].sort((a, b) => {
      const CATEGORY_ORDER = [
        "Recent",
        "Navigate",
        "Actions",
        "Saved",
        "Resources",
        "Findings",
        "Help",
      ] as const;
      const catDiff =
        CATEGORY_ORDER.indexOf(
          a.category as (typeof CATEGORY_ORDER)[number],
        ) -
        CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]);
      if (catDiff !== 0) return catDiff;
      return b.score - a.score;
    });
  }, [syncResults, asyncResults]);

  function handleSelect(result: CommandResult) {
    appendRecent(org.id, result.id);
    if (result.href) {
      router.push(result.href);
    } else if (result.onSelect) {
      result.onSelect();
    }
    closeBar();
  }

  return (
    <Modal open={open} onOpenChange={(v) => !v && closeBar()}>
      <ModalContent
        className="max-w-2xl p-0 top-[30%]"
        aria-describedby={undefined}
      >
        <Dialog.Title className="sr-only">Command bar</Dialog.Title>
        <div className="flex items-center gap-2 px-3 h-12 border-b border-border-subtle">
          <Search className="size-4 text-text-muted" aria-hidden />
          <input
            ref={inputRef}
            role="searchbox"
            data-command-bar-input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search resources, or jump…"
            aria-label="Command bar — type to search"
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-faint"
          />
          <kbd className="text-mono-sm text-text-faint font-mono">Esc</kbd>
        </div>
        <div className="p-2 min-h-[280px] overflow-y-auto max-h-[400px]">
          <CommandBarResults results={allResults} onSelect={handleSelect} />
        </div>
      </ModalContent>
    </Modal>
  );
}

const CATEGORY_LABELS: Record<CommandResult["category"], string> = {
  Recent: "Recent",
  Navigate: "Navigate",
  Actions: "Actions",
  Saved: "Saved",
  Resources: "Resources",
  Findings: "Findings",
  Help: "Help",
};

function CommandBarResults({
  results,
  onSelect,
}: {
  results: CommandResult[];
  onSelect: (r: CommandResult) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="text-sm text-text-muted px-2 py-8 text-center">
        Type to search…
      </div>
    );
  }

  // Group by category
  const grouped = new Map<CommandResult["category"], CommandResult[]>();
  for (const result of results) {
    const cat = result.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(result);
  }

  return (
    <div className="space-y-1">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <div className="px-2 py-1 text-xs font-medium text-text-faint uppercase tracking-wider">
            {CATEGORY_LABELS[category]}
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left",
                "text-text-primary hover:bg-bg-elevated focus:bg-bg-elevated",
                "outline-none transition-colors",
              )}
            >
              <span className="flex-1 truncate">{item.label}</span>
              {item.hint && (
                <span className="text-xs text-text-faint font-mono shrink-0">
                  {item.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

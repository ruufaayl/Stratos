"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check, Cloud as CloudIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useCloud, type Cloud } from "@/lib/shell/cloud-context";
import { useOrg } from "@/lib/shell/org-context";
import { cn } from "@/lib/utils";

const LABELS: Record<Cloud, string> = { aws: "AWS", azure: "Azure", gcp: "GCP" };

const CLOUD_SCOPED = /^\/app\/[^/]+\/(aws|azure|gcp)(\/|$)/;

export function CloudSwitcher() {
  const { active, available, setActive } = useCloud();
  const { org } = useOrg();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  // Hide when: only 1 cloud (regardless of path)
  if (available.length <= 1) return null;

  const cloudScoped = CLOUD_SCOPED.test(pathname);

  const choose = (c: Cloud) => {
    setActive(c);
    if (cloudScoped) {
      const next = pathname.replace(/(\/app\/[^/]+\/)(aws|azure|gcp)/, `$1${c}`);
      router.push(next);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex items-center gap-1.5 h-8 px-2 rounded-md text-mono-sm font-mono uppercase text-text-primary",
          "hover:bg-bg-elevated focus-visible:bg-bg-elevated",
        )}
        aria-label={`Active cloud: ${LABELS[active]}`}
      >
        <CloudIcon className="size-3.5 text-text-muted" />
        {LABELS[active]}
        <ChevronDown className="size-3.5 text-text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          className="min-w-[160px] rounded-card border border-border-subtle bg-bg-elevated p-1 shadow-xl"
        >
          {available.map((c) => (
            <DropdownMenu.Item
              key={c}
              onSelect={() => choose(c)}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface"
            >
              <Check className={cn("size-3.5", c === active ? "text-intel-500" : "opacity-0")} />
              {LABELS[c]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

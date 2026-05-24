"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Plus, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useOrg } from "@/lib/shell/org-context";
import { cn } from "@/lib/utils";

type OrgListItem = { id: string; slug: string; name: string; sigilColor: string };

export function OrgSwitcher({ orgs }: { orgs: readonly OrgListItem[] }) {
  const { org } = useOrg();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const single = orgs.length <= 1;

  const navigateToOrg = (slug: string) => {
    if (slug === org.slug) return;
    const suffix = pathname.replace(`/app/${org.slug}`, `/app/${slug}`);
    router.push(suffix.startsWith(`/app/${slug}`) ? suffix : `/app/${slug}`);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={single}
        className={cn(
          "flex items-center gap-2 h-8 px-2 rounded-md text-sm text-text-primary",
          !single && "hover:bg-bg-elevated focus-visible:bg-bg-elevated",
          single && "cursor-default",
        )}
        aria-label={single ? `Current org: ${org.name}` : "Switch org"}
      >
        <span aria-hidden className="size-4 rounded-sm" style={{ background: org.sigilColor }} />
        <span className="font-medium truncate max-w-[180px]">{org.name}</span>
        {!single && <ChevronDown className="size-3.5 text-text-muted" />}
      </DropdownMenu.Trigger>
      {!single && (
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            className="min-w-[260px] rounded-card border border-border-subtle bg-bg-elevated p-1 shadow-xl"
          >
            {orgs.map((o) => (
              <DropdownMenu.Item
                key={o.id}
                onSelect={() => navigateToOrg(o.slug)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface"
              >
                <span aria-hidden className="size-3.5 rounded-sm" style={{ background: o.sigilColor }} />
                <span className="flex-1 truncate">{o.name}</span>
                <span className="text-mono-sm font-mono text-text-faint">{o.slug}</span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
            <DropdownMenu.Item
              onSelect={() => router.push("/orgs/create")}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface"
            >
              <Plus className="size-3.5" /> Create org
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => router.push("/orgs")}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface"
            >
              <Settings className="size-3.5" /> Manage orgs
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      )}
    </DropdownMenu.Root>
  );
}

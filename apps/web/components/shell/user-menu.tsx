"use client";
import { useState, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Settings, Shield, User } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [tier, setTier] = useState<"free" | "pro" | null>(null);

  const name = user?.fullName ?? "User";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const isStaff = user?.publicMetadata?.staff === true;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    fetch("/api/scan/usage")
      .then(r => r.ok ? r.json() : null)
      .then((data: { tier: string } | null) => {
        if (data) setTier(data.tier as "free" | "pro");
      })
      .catch(() => {});
  }, []);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex items-center justify-center size-8 rounded-full text-xs font-semibold",
          "bg-intel-500/20 text-intel-400 hover:bg-intel-500/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intel-500",
        )}
        aria-label="User menu"
      >
        {initials}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="min-w-[220px] rounded-card border border-border-subtle bg-bg-elevated p-1 shadow-xl"
        >
          {/* User info header */}
          <div className="px-2 py-2 mb-1 border-b border-border-subtle">
            <div className="flex items-center">
              <div className="text-sm font-medium text-text-primary truncate">{name}</div>
              <span className={cn(
                "ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                tier === "pro"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/10 text-white/40 border border-white/10"
              )}>
                {tier === "pro" ? "Pro" : "Free"}
              </span>
            </div>
            <div className="text-xs text-text-muted truncate">{email}</div>
          </div>

          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface">
            <User className="size-3.5 text-text-muted" />
            Profile
          </DropdownMenu.Item>

          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface">
            <Settings className="size-3.5 text-text-muted" />
            Settings
          </DropdownMenu.Item>

          {isStaff && (
            <DropdownMenu.Item className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface">
              <Shield className="size-3.5 text-text-muted" />
              Admin
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />

          <DropdownMenu.Item
            onSelect={() => signOut()}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-waste-400 hover:bg-bg-surface cursor-pointer outline-none focus:bg-bg-surface"
          >
            <LogOut className="size-3.5" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

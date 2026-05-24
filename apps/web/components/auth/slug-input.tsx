"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { isValidSlugFormat, isReservedSlug } from "@/lib/auth/reserved-slugs";

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "format-error" }
  | { state: "reserved" }
  | { state: "taken" }
  | { state: "error" };

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

export function SlugInput({ value, onChange, className }: Props) {
  const [status, setStatus] = React.useState<SlugStatus>({ state: "idle" });
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setStatus({ state: "idle" });
      return;
    }

    // Client-side format check — immediate feedback
    if (!isValidSlugFormat(value)) {
      setStatus({ state: "format-error" });
      return;
    }

    if (isReservedSlug(value)) {
      setStatus({ state: "reserved" });
      return;
    }

    // Debounce API call
    setStatus({ state: "checking" });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/orgs/check-slug?slug=${encodeURIComponent(value)}`,
        );
        const data = await res.json();
        if (data.ok) {
          setStatus({ state: "available" });
        } else if (data.reason === "taken") {
          setStatus({ state: "taken" });
        } else if (data.reason === "reserved") {
          setStatus({ state: "reserved" });
        } else if (data.reason === "format") {
          setStatus({ state: "format-error" });
        } else {
          setStatus({ state: "error" });
        }
      } catch {
        setStatus({ state: "error" });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const isInvalid =
    status.state === "format-error" ||
    status.state === "reserved" ||
    status.state === "taken";

  return (
    <div className={cn("w-full", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={isInvalid || undefined}
        aria-invalid={isInvalid || undefined}
        placeholder="acme-corp"
        autoComplete="off"
        spellCheck={false}
      />
      <StatusLine status={status} />
    </div>
  );
}

function StatusLine({ status }: { status: SlugStatus }) {
  switch (status.state) {
    case "idle":
      return null;
    case "checking":
      return (
        <p className="text-text-faint text-xs mt-1 font-mono">Checking…</p>
      );
    case "available":
      return (
        <p className="text-savings-500 text-xs mt-1 font-mono">Available</p>
      );
    case "format-error":
      return (
        <p className="text-waste-500 text-xs mt-1 font-mono">
          Invalid format — use lowercase letters, numbers and hyphens only
        </p>
      );
    case "reserved":
      return (
        <p className="text-waste-500 text-xs mt-1 font-mono">Reserved name</p>
      );
    case "taken":
      return (
        <p className="text-waste-500 text-xs mt-1 font-mono">Already taken</p>
      );
    case "error":
      return (
        <p className="text-risk-500 text-xs mt-1 font-mono">
          Could not check availability
        </p>
      );
    default:
      return null;
  }
}

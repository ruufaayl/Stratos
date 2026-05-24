"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** 7-color palette from the v2 design system (hex literals, not Tailwind classes) */
export const SIGIL_COLORS = [
  "#6366F1", // intel-500
  "#10B981", // savings-500
  "#F59E0B", // risk-500
  "#EF4444", // waste-500
  "#A855F7", // purple accent
  "#06B6D4", // cyan accent
  "#EAB308", // yellow accent
] as const;

export type SigilColor = (typeof SIGIL_COLORS)[number];

type Props = {
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

export function SigilPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("flex gap-2", className)}>
      {SIGIL_COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            aria-pressed={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              "size-8 rounded-md relative flex items-center justify-center",
              "transition-transform hover:scale-110 focus-visible:outline-none",
              selected &&
                "ring-2 ring-offset-2 ring-offset-bg-canvas ring-[#6366F1]",
            )}
            style={{ backgroundColor: color }}
          >
            {selected && (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="size-4 text-white drop-shadow"
                aria-hidden="true"
              >
                <path
                  d="M3 8l3.5 3.5L13 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Deterministic color selection from a string (e.g. org name).
 * Returns one of the 7 SIGIL_COLORS based on a simple hash.
 */
export function sigilColorFromString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return SIGIL_COLORS[hash % SIGIL_COLORS.length] as string;
}

"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const number = cva("font-numeric tracking-[-0.02em]", {
  variants: {
    size: { sm: "text-kpi-sm", md: "text-kpi", lg: "text-kpi-hero" },
    tone: {
      neutral: "text-text-primary",
      intel:   "text-intel-300",
      savings: "text-savings-500",
      waste:   "text-waste-500",
      risk:    "text-risk-500",
    },
  },
  defaultVariants: { size: "md", tone: "neutral" },
});

type StatProps = {
  label: string;
  value: React.ReactNode;
  /** Plain-language description for screen readers (spec §9.5). */
  srDescription?: string;
  /** Optional bottom-line caption ("across 248,458 resources"). */
  caption?: React.ReactNode;
  /** Optional top-right delta chip. */
  delta?: React.ReactNode;
} & VariantProps<typeof number>;

export function Stat({ label, value, srDescription, caption, delta, size, tone }: StatProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono uppercase text-mono-xs text-text-muted">{label}</span>
        {delta}
      </div>
      <div className={cn(number({ size, tone }))}>
        {value}
        {srDescription ? <span className="sr-only"> — {srDescription}</span> : null}
      </div>
      {caption ? <div className="text-mono-sm text-text-faint">{caption}</div> : null}
    </div>
  );
}

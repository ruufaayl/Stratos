import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chip = cva(
  "inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] " +
    "rounded-chip border whitespace-nowrap",
  {
    variants: {
      kind: {
        intelligence: "bg-intel-950   text-intel-300   border-intel-950",
        savings:      "bg-savings-950 text-savings-300 border-savings-950",
        waste:        "bg-waste-950   text-waste-300   border-waste-950",
        risk:         "bg-risk-950    text-risk-300    border-risk-950",
        neutral:      "bg-bg-elevated text-text-muted  border-border-subtle",
      },
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        md: "h-6 px-2   text-[11px]",
      },
    },
    defaultVariants: { kind: "neutral", size: "md" },
  },
);

export type ChipProps =
  React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chip>;

export function Chip({ className, kind, size, ...props }: ChipProps) {
  return <span className={cn(chip({ kind, size }), className)} {...props} />;
}

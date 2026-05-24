"use client";
import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { cardEnter, duration, easing } from "@/lib/design/motion";

const card = cva(
  "rounded-card border bg-bg-surface text-text-primary",
  {
    variants: {
      intent: {
        default: "border-border-subtle",
        intel:   "border-intel-950",
        savings: "border-savings-950",
        waste:   "border-waste-950",
        risk:    "border-risk-950",
      },
      hover: { none: "", lift: "transition-colors hover:border-border-strong" },
    },
    defaultVariants: { intent: "default", hover: "none" },
  },
);

type CardProps =
  HTMLMotionProps<"div"> &
  VariantProps<typeof card> & {
    /** Enter with the staggered fade-in. Opt-in to avoid animating on refresh. */
    animateIn?: boolean;
  };

export function Card({ className, intent, hover, animateIn, ...props }: CardProps) {
  if (animateIn) {
    return (
      <motion.div
        className={cn(card({ intent, hover }), className)}
        variants={cardEnter}
        initial="hidden"
        animate="visible"
        whileHover={hover === "lift" ? { y: -2, transition: { duration: duration.hover, ease: easing.out } } : undefined}
        {...props}
      />
    );
  }
  return (
    <motion.div
      className={cn(card({ intent, hover }), className)}
      whileHover={hover === "lift" ? { y: -2, transition: { duration: duration.hover, ease: easing.out } } : undefined}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4 pb-3 border-b border-border-subtle flex items-center justify-between", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-mono uppercase text-mono-xs text-text-muted", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-3 border-t border-border-subtle text-mono-sm text-text-muted", className)} {...props} />;
}

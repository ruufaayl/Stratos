import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out " +
    "disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap rounded",
  {
    variants: {
      intent: {
        primary:     "bg-intel-500 text-white hover:bg-intel-300 hover:text-intel-950",
        secondary:   "bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong",
        ghost:       "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
        destructive: "bg-waste-500 text-white hover:bg-waste-300 hover:text-waste-950",
      },
      size: {
        sm: "h-7  px-2.5 text-[12px]",
        md: "h-9  px-3.5 text-[13px]",
        lg: "h-11 px-5   text-[14px]",
      },
    },
    defaultVariants: { intent: "primary", size: "md" },
  },
);

export type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, intent, size, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(button({ intent, size }), className)}
        {...props}
      />
    );
  },
);

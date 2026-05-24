import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const input = cva(
  "w-full bg-bg-sunken text-text-primary placeholder:text-text-faint " +
    "border border-border-subtle rounded transition-colors " +
    "hover:border-border-strong focus:border-intel-500 " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      size: { sm: "h-7 px-2 text-[12px]", md: "h-9 px-3 text-[13px]", lg: "h-11 px-3.5 text-[14px]" },
      invalid: { true: "border-waste-500 focus:border-waste-500", false: "" },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);

export type InputProps =
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof input>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, size, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(input({ size, invalid }), className)}
        {...props}
      />
    );
  },
);

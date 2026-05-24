import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = React.ComponentPropsWithoutRef<typeof Link> & {
  className?: string;
};

/**
 * Styled anchor for auth flow contextual links — "Forgot password?", "Sign up", etc.
 * Uses intel-300 accent per v2 design tokens.
 */
export function AuthLink({ className, children, ...props }: Props) {
  return (
    <Link
      className={cn(
        "text-intel-300 hover:text-intel-300/80 text-sm transition-colors duration-150",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

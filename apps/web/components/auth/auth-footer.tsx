import * as React from "react";
import Link from "next/link";

/**
 * Legal + brand line rendered at the bottom of every auth screen.
 * Colour: text-text-faint per v2 design tokens.
 */
export function AuthFooter() {
  return (
    <p className="text-xs text-text-faint text-center space-x-1">
      <span>&copy; Stratos &middot; Global &middot; No HQ</span>
      <span aria-hidden="true">&middot;</span>
      <Link
        href="/legal/terms"
        className="hover:text-text-muted transition-colors duration-150"
      >
        Terms
      </Link>
      <span aria-hidden="true">&middot;</span>
      <Link
        href="/legal/privacy"
        className="hover:text-text-muted transition-colors duration-150"
      >
        Privacy
      </Link>
    </p>
  );
}

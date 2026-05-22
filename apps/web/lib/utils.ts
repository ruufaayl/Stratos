import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a dollar number the way Stratos always shows money. */
export function usd(n: number, opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.compact && Math.abs(n) >= 10_000 ? 0 : 2,
    notation: opts.compact ? "compact" : "standard",
  }).format(n);
}

"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  totalCount: number;
  baseHref: string;
}

export function PaginationBar({ page, pageSize, totalCount, baseHref }: PaginationBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  function navigateTo(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    router.push(`${baseHref}?${params.toString()}`);
  }

  const isPrevDisabled = page <= 1;
  const isNextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
      <p className="text-[13px] text-text-faint">
        {totalCount === 0
          ? "No findings"
          : `Showing ${start}–${end} of ${totalCount} finding${totalCount !== 1 ? "s" : ""}`}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigateTo(page - 1)}
          disabled={isPrevDisabled}
          aria-label="Previous page"
          className={cn(
            "bg-bg-elevated border border-border-subtle hover:border-border-strong",
            "text-[13px] rounded h-8 px-3 text-text-primary transition-colors",
            isPrevDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
          )}
        >
          ← Prev
        </button>

        <span className="text-[13px] text-text-muted px-1">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => navigateTo(page + 1)}
          disabled={isNextDisabled}
          aria-label="Next page"
          className={cn(
            "bg-bg-elevated border border-border-subtle hover:border-border-strong",
            "text-[13px] rounded h-8 px-3 text-text-primary transition-colors",
            isNextDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
          )}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

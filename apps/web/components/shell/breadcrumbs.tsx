"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { labelForSegment } from "@/lib/shell/breadcrumb-registry";
import { useOrg } from "@/lib/shell/org-context";

export function Breadcrumbs() {
  const pathname = usePathname() ?? "";
  const { org } = useOrg();
  const prefix = `/app/${org.slug}`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).replace(/^\/+/, "");
  if (!rest) return null;

  const all = rest.split("/").filter(Boolean);
  const visible = all.slice(-3);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-text-muted min-w-0">
      {visible.map((seg, i) => {
        const isLast = i === visible.length - 1;
        const hrefSegments = all.slice(0, all.length - visible.length + i + 1);
        const href = `${prefix}/${hrefSegments.join("/")}`;
        const label = labelForSegment(seg);
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span aria-hidden className="text-text-faint">›</span>}
            {isLast ? (
              <span aria-current="page" className="text-text-primary truncate">{label}</span>
            ) : (
              <Link href={href} className="hover:text-text-primary truncate">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

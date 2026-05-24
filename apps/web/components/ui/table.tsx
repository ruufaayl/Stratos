import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto border border-border-subtle rounded-card">
      <table className={cn("w-full text-[13px] border-collapse", className)} {...props} />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn("bg-bg-elevated text-text-muted font-mono uppercase text-mono-xs", props.className)} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TR(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn("border-b border-border-subtle last:border-0 hover:bg-bg-elevated/60 transition-colors", props.className)} />;
}
export function TH(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cn("text-left font-medium px-3 h-9 align-middle", props.className)} />;
}
export function TD({
  numeric,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      {...props}
      className={cn(
        "px-3 h-10 align-middle text-text-secondary",
        numeric && "font-numeric text-right",
        className,
      )}
    />
  );
}

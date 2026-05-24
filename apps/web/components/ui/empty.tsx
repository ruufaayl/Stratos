import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyProps = {
  title: string;
  body?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function Empty({ title, body, icon, action, className }: EmptyProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-6 py-12",
      "border border-dashed border-border-subtle rounded-card bg-bg-surface",
      className,
    )}>
      {icon ? <div className="text-text-muted mb-3">{icon}</div> : null}
      <div className="text-[15px] font-medium text-text-primary">{title}</div>
      {body ? <div className="text-mono-sm text-text-muted mt-1 max-w-sm">{body}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

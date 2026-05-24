"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthCard({ title, subtitle, children, footer, className }: Props) {
  return (
    <div
      className={cn(
        "w-full max-w-[420px] bg-bg-elevated border border-border-subtle rounded-card p-8 shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="mb-6 text-center">
        <h1 className="text-h2 text-text-primary">{title}</h1>
        {subtitle && <p className="text-text-muted text-sm mt-2">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && (
        <div className="mt-6 pt-6 border-t border-border-subtle text-center text-mono-sm font-mono">
          {footer}
        </div>
      )}
    </div>
  );
}

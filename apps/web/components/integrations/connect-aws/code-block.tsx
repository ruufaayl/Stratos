"use client";
import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  language?: string;
  code: string;
  ariaLabel?: string;
  className?: string;
};

export function CodeBlock({ language = "json", code, ariaLabel, className }: Props) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("relative rounded border border-border-subtle bg-bg-elevated", className)}>
      <div className="absolute top-2 right-2">
        <Button
          intent="ghost"
          size="sm"
          onClick={handleCopy}
          aria-label="Copy code"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="sr-only">Copy</span>
        </Button>
      </div>
      <pre
        className="p-4 pr-12 overflow-x-auto text-[12px] font-mono text-text-primary leading-relaxed"
        aria-label={ariaLabel}
      >
        <code data-language={language}>{code}</code>
      </pre>
    </div>
  );
}

"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
};

export function OtpInput({
  length = 6,
  value,
  onChange,
  ariaLabel = "Verification code",
}: Props) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, char: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[i] = char;
    const next = chars.join("").trimEnd().slice(0, length);
    onChange(next);
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            if (c) {
              setAt(i, c);
              refs.current[i + 1]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, length);
            if (text.length) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, length - 1)]?.focus();
            }
          }}
          className={cn(
            "size-12 text-center text-xl font-mono bg-bg-surface border border-border-subtle rounded-md text-text-primary",
            "focus:border-intel-500 focus:outline-none",
          )}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

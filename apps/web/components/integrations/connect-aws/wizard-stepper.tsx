"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["Name", "Role", "Verify", "Done"] as const;

type Props = { currentStep: 1 | 2 | 3 | 4 };

export function WizardStepper({ currentStep }: Props) {
  return (
    <div className="flex items-center mb-8">
      {LABELS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3 | 4;
        const stepState = step < currentStep ? "done" : step === currentStep ? "active" : "pending";
        const isLast = i === LABELS.length - 1;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-medium transition-colors",
                  stepState === "done" &&
                    "bg-savings-500/20 border-savings-500 text-savings-500",
                  stepState === "active" &&
                    "bg-intel-500/20 border-intel-500 text-intel-300",
                  stepState === "pending" &&
                    "bg-transparent border-border-strong text-text-faint",
                )}
              >
                {stepState === "done" ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  stepState === "done" && "text-savings-500",
                  stepState === "active" && "text-text-primary",
                  stepState === "pending" && "text-text-faint",
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-px mx-2 mb-5 transition-colors",
                  step < currentStep ? "bg-savings-500" : "bg-border-strong",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

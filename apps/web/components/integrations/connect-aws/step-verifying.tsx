"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardState, Action, Phase } from "./connect-aws-wizard-state";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<Action>;
  orgSlug: string;
  /**
   * When true (set by Storybook stories via ConnectAwsWizard's initialState
   * prop), the useEffect that fires POST /api/accounts is skipped. This
   * prevents network noise / 404s in Storybook while still rendering the
   * correct visual state driven by `state`.
   */
  skipEffect?: boolean;
};

type VerifyPhase = "assuming" | "identity" | "regions" | "persisting";

const PHASES: VerifyPhase[] = ["assuming", "identity", "regions", "persisting"];

const PHASE_LABELS: Record<VerifyPhase, string> = {
  assuming: "Assuming role",
  identity: "Verifying identity",
  regions: "Discovering regions",
  persisting: "Saving connection",
};

export function StepVerifying({ state, dispatch, orgSlug, skipEffect }: Props) {
  const router = useRouter();
  const [currentPhaseIdx, setCurrentPhaseIdx] = React.useState(-1);

  React.useEffect(() => {
    // When rendered from Storybook stories (skipEffect=true), skip the fetch
    // and animation loop so no network calls fire and the story renders the
    // static visual state from `state`.
    if (skipEffect) return;

    // Kick off phase animation
    dispatch({ type: "PHASE", phase: "assuming" });
    setCurrentPhaseIdx(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < PHASES.length) {
        setCurrentPhaseIdx(idx);
        dispatch({ type: "PHASE", phase: PHASES[idx] as Phase });
      } else {
        clearInterval(interval);
      }
    }, 400);

    // Fire API call in parallel — externalId is now derived server-side
    fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        roleArn: state.roleArn,
        region: state.region,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.account) {
          dispatch({
            type: "SUCCESS",
            accountId: data.account.id,
            awsAccountId: data.account.awsAccountId,
          });
        } else {
          dispatch({ type: "PHASE", phase: "error" as Phase });
        }
      })
      .catch(() => {
        dispatch({ type: "PHASE", phase: "error" as Phase });
      });

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect on success (skipped in Storybook via skipEffect)
  React.useEffect(() => {
    if (skipEffect) return;
    if (state.phase === "done") {
      const timeout = setTimeout(() => {
        router.push(`/app/${orgSlug}`);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [state.phase, orgSlug, router, skipEffect]);

  const isError = state.phase === "error";
  const isDone = state.phase === "done";

  return (
    <Card>
      <CardBody className="py-10">
        <div className="flex flex-col items-center gap-8">
          {/* Phase list */}
          <ul className="space-y-3 w-full max-w-xs">
            {PHASES.map((phase, idx) => {
              const isDonePhase = idx < currentPhaseIdx || isDone;
              const isActive = idx === currentPhaseIdx && !isDone && !isError;

              return (
                <li key={phase} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] shrink-0",
                      isDonePhase
                        ? "border-savings-500 bg-savings-500/20 text-savings-500"
                        : isActive
                          ? "border-intel-500 bg-intel-500/20 text-intel-300"
                          : "border-border-strong bg-transparent text-text-faint",
                    )}
                  >
                    {isDonePhase ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      isDonePhase
                        ? "text-text-primary"
                        : isActive
                          ? "text-text-primary font-medium"
                          : "text-text-faint",
                    )}
                  >
                    {PHASE_LABELS[phase]}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Error state */}
          {isError && (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-waste-500 bg-waste-500/20 text-waste-500">
                <X className="h-4 w-4" />
              </span>
              <p className="text-sm text-text-muted">
                {state.errorMessage || "Could not connect to AWS. Check the role ARN and try again."}
              </p>
              <Button
                intent="secondary"
                onClick={() => dispatch({ type: "GOTO_STEP", step: 3 })}
              >
                Try again
              </Button>
            </div>
          )}

          {/* Success state */}
          {isDone && (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-savings-500 bg-savings-500/20 text-savings-500">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm text-text-primary font-medium">
                Connected to AWS account {state.awsAccountId}
              </p>
              <p className="text-xs text-text-muted">Redirecting…</p>
            </div>
          )}

          {/* In-progress label */}
          {!isError && !isDone && (
            <p className="text-xs text-text-muted">
              {currentPhaseIdx >= PHASES.length - 1 ? "Almost done…" : "Connecting…"}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

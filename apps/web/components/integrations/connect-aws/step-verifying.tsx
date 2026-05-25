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
   * prop), the useEffects that fire API calls are skipped. This prevents
   * network noise / 404s in Storybook while still rendering the correct visual
   * state driven by `state`.
   */
  skipEffect?: boolean;
};

type VerifyPhase =
  | "assuming"
  | "identity"
  | "regions"
  | "persisting"
  | "listing"
  | "fetching"
  | "analyzing";

const PHASES: VerifyPhase[] = [
  "assuming",
  "identity",
  "regions",
  "persisting",
  "listing",
  "fetching",
  "analyzing",
];

const PHASE_LABELS: Record<VerifyPhase, string> = {
  assuming: "Assuming role",
  identity: "Verifying identity",
  regions: "Discovering regions",
  persisting: "Saving connection",
  listing: "Discovering EC2 instances",
  fetching: "Fetching metrics",
  analyzing: "Analyzing for waste",
};

/** Phase index where scan animation begins. */
const SCAN_PHASE_START = PHASES.indexOf("listing"); // 4

export function StepVerifying({ state, dispatch, orgSlug, skipEffect }: Props) {
  const router = useRouter();
  const [currentPhaseIdx, setCurrentPhaseIdx] = React.useState(-1);

  // Phase 1: account creation (assuming → persisting)
  React.useEffect(() => {
    if (skipEffect) return;

    dispatch({ type: "PHASE", phase: "assuming" });
    setCurrentPhaseIdx(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < SCAN_PHASE_START) {
        setCurrentPhaseIdx(idx);
        dispatch({ type: "PHASE", phase: PHASES[idx] as Phase });
      } else {
        clearInterval(interval);
      }
    }, 400);

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
          setCurrentPhaseIdx(SCAN_PHASE_START);
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

  // Phase 2: scan (listing → fetching → analyzing)
  // Fires when SUCCESS dispatched accountId and phase transitions to "listing".
  React.useEffect(() => {
    if (skipEffect) return;
    if (state.phase !== "listing" || !state.accountId) return;

    const SCAN_ANIM: ("fetching" | "analyzing")[] = ["fetching", "analyzing"];
    let scanIdx = 0;
    const scanInterval = setInterval(() => {
      if (scanIdx < SCAN_ANIM.length) {
        const ph = SCAN_ANIM[scanIdx]!;
        setCurrentPhaseIdx(SCAN_PHASE_START + scanIdx + 1);
        dispatch({ type: "PHASE", phase: ph });
        scanIdx += 1;
      }
    }, 2000);

    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: state.accountId }),
    })
      .then(async (res) => {
        clearInterval(scanInterval);
        const data = await res.json();
        if (res.ok) {
          setCurrentPhaseIdx(PHASES.length);
          dispatch({
            type: "SCAN_SUCCESS",
            runId: data.runId as string,
            totalFindings: data.totalFindings as number,
            totalSavingsCents: data.totalSavingsCents as number,
          });
        } else {
          dispatch({
            type: "SCAN_ERROR",
            message: (data.error as string | undefined) ?? "Scan failed",
          });
        }
      })
      .catch(() => {
        clearInterval(scanInterval);
        dispatch({ type: "SCAN_ERROR", message: "Scan failed — could not reach server" });
      });

    return () => clearInterval(scanInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.accountId]);

  // Redirect to org overview when done
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
              {state.scanResult && state.scanResult.totalFindings > 0 && (
                <p className="text-xs text-savings-500">
                  Found {state.scanResult.totalFindings} optimization
                  {state.scanResult.totalFindings !== 1 ? "s" : ""} ·{" "}
                  ${Math.round(state.scanResult.totalSavingsCents / 100).toLocaleString()}/mo potential savings
                </p>
              )}
              {state.scanResult && state.scanResult.totalFindings === 0 && (
                <p className="text-xs text-text-muted">No waste found yet — check back after 24h of data</p>
              )}
              <p className="text-xs text-text-muted">Redirecting…</p>
            </div>
          )}

          {/* In-progress label */}
          {!isError && !isDone && (
            <p className="text-xs text-text-muted">
              {currentPhaseIdx >= SCAN_PHASE_START
                ? "Scanning for waste…"
                : currentPhaseIdx >= SCAN_PHASE_START - 1
                  ? "Almost done…"
                  : "Connecting…"}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

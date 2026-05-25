"use client";
import * as React from "react";
import { reducer, initialState, type WizardState } from "./connect-aws-wizard-state";
import { WizardStepper } from "./wizard-stepper";
import { StepName } from "./step-name";
import { StepRole } from "./step-role";
import { StepArn } from "./step-arn";
import { StepVerifying } from "./step-verifying";

type Props = {
  externalId: string;
  stratosPrincipal: string;
  orgSlug: string;
  /** For stories + tests: override initial state */
  initialState?: WizardState;
};

export function ConnectAwsWizard({
  externalId,
  stratosPrincipal,
  orgSlug,
  initialState: init,
}: Props) {
  const [state, dispatch] = React.useReducer(reducer, init ?? initialState);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <WizardStepper currentStep={state.step} />
      {state.step === 1 && <StepName state={state} dispatch={dispatch} />}
      {state.step === 2 && (
        <StepRole
          state={state}
          dispatch={dispatch}
          externalId={externalId}
          stratosPrincipal={stratosPrincipal}
        />
      )}
      {state.step === 3 && <StepArn state={state} dispatch={dispatch} />}
      {state.step === 4 && (
        <StepVerifying
          state={state}
          dispatch={dispatch}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

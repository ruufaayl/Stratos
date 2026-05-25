"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { WizardState, Action } from "./connect-aws-wizard-state";

const ARN_REGEX = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/;

const DEFAULT_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
];

type Props = { state: WizardState; dispatch: React.Dispatch<Action> };

export function StepArn({ state, dispatch }: Props) {
  const arnValid = ARN_REGEX.test(state.roleArn);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste the role ARN</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-text-muted text-sm">
          Copy the role ARN from the CloudFormation outputs or the IAM console.
        </p>
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">Role ARN</label>
          <Input
            value={state.roleArn}
            onChange={(e) => dispatch({ type: "SET_ROLE_ARN", value: e.target.value })}
            placeholder="arn:aws:iam::123456789012:role/StratosReadOnly"
            aria-invalid={!arnValid && state.roleArn !== "" ? true : undefined}
          />
        </div>
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">Default region</label>
          <select
            value={state.region}
            onChange={(e) => dispatch({ type: "SET_REGION", value: e.target.value })}
            className="w-full bg-bg-sunken text-text-primary border border-border-subtle rounded h-9 px-3 text-[13px] transition-colors hover:border-border-strong focus:border-intel-500 focus:outline-none"
          >
            {DEFAULT_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </CardBody>
      <CardFooter className="flex justify-between">
        <Button intent="secondary" onClick={() => dispatch({ type: "PREV_STEP" })}>
          ← Back
        </Button>
        <Button
          disabled={!arnValid}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          Verify &amp; connect →
        </Button>
      </CardFooter>
    </Card>
  );
}

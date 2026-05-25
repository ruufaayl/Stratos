"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { WizardState, Action } from "./connect-aws-wizard-state";

type Props = { state: WizardState; dispatch: React.Dispatch<Action> };

export function StepName({ state, dispatch }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Name your AWS account</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-text-muted text-sm">
          Give this connection a memorable name — usually your AWS account alias or environment.
        </p>
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">Account name</label>
          <Input
            value={state.name}
            onChange={(e) => dispatch({ type: "SET_NAME", value: e.target.value })}
            placeholder="acme-prod"
          />
        </div>
      </CardBody>
      <CardFooter className="flex justify-end">
        <Button
          disabled={!state.name.trim()}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          Continue →
        </Button>
      </CardFooter>
    </Card>
  );
}

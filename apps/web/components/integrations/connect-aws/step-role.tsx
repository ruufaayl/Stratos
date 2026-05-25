"use client";
import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Copy, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "./code-block";
import { PolicyBlocks } from "./policy-blocks";
import { cn } from "@/lib/utils";
import type { WizardState, Action } from "./connect-aws-wizard-state";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<Action>;
  externalId: string;
  stratosPrincipal: string;
};

export function StepRole({ state: _state, dispatch, externalId, stratosPrincipal }: Props) {
  const [copiedExtId, setCopiedExtId] = React.useState(false);

  const cfnUrl = `https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=StratosReadOnly&templateURL=https%3A%2F%2Fstratos-cfn.s3.amazonaws.com%2Fstratos-readonly-role.json&param_ExternalId=${externalId}&param_StratosPrincipal=${encodeURIComponent(stratosPrincipal)}`;

  async function copyExternalId() {
    await navigator.clipboard.writeText(externalId);
    setCopiedExtId(true);
    setTimeout(() => setCopiedExtId(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create the IAM role</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <Tabs.Root defaultValue="cfn">
          <Tabs.List className="flex gap-1 border-b border-border-subtle mb-4">
            <Tabs.Trigger
              value="cfn"
              className={cn(
                "px-3 py-1.5 text-[13px] font-medium rounded-t transition-colors",
                "text-text-muted hover:text-text-primary",
                "data-[state=active]:text-text-primary data-[state=active]:border-b-2 data-[state=active]:border-intel-500",
              )}
            >
              One-click CloudFormation
            </Tabs.Trigger>
            <Tabs.Trigger
              value="manual"
              className={cn(
                "px-3 py-1.5 text-[13px] font-medium rounded-t transition-colors",
                "text-text-muted hover:text-text-primary",
                "data-[state=active]:text-text-primary data-[state=active]:border-b-2 data-[state=active]:border-intel-500",
              )}
            >
              Manual setup
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="cfn" className="space-y-4">
            <p className="text-text-muted text-sm">
              Launches a CloudFormation stack that creates the read-only IAM role with the correct
              trust policy and inline permissions, pre-configured.
            </p>
            <a
              href={cfnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full">Launch in CloudFormation →</Button>
            </a>
            <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded px-3 py-2">
              <span className="text-mono-xs text-text-muted font-mono shrink-0">External ID</span>
              <span className="text-[12px] font-mono text-text-primary truncate flex-1">{externalId}</span>
              <button
                type="button"
                onClick={copyExternalId}
                aria-label="Copy external ID"
                className="text-text-muted hover:text-text-primary transition-colors shrink-0"
              >
                {copiedExtId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Tabs.Content>

          <Tabs.Content value="manual" className="space-y-4">
            <ol className="space-y-4 list-none">
              <li>
                <p className="text-sm text-text-muted mb-2">
                  1. Create a new IAM role with this trust policy:
                </p>
                <PolicyBlocks externalId={externalId} stratosPrincipal={stratosPrincipal} />
              </li>
            </ol>
          </Tabs.Content>
        </Tabs.Root>
      </CardBody>
      <CardFooter className="flex justify-between">
        <Button intent="secondary" onClick={() => dispatch({ type: "PREV_STEP" })}>
          ← Back
        </Button>
        <Button onClick={() => dispatch({ type: "NEXT_STEP" })}>
          I&apos;ve created the role →
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";
import * as React from "react";
import { CodeBlock } from "./code-block";

type Props = {
  externalId: string;
  stratosPrincipal: string;
};

export function PolicyBlocks({ externalId, stratosPrincipal }: Props) {
  const trustPolicy = JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: stratosPrincipal },
          Action: "sts:AssumeRole",
          Condition: {
            StringEquals: { "sts:ExternalId": externalId },
          },
        },
      ],
    },
    null,
    2,
  );

  const permissionsPolicy = JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "ec2:Describe*",
            "cloudwatch:GetMetricStatistics",
            "cloudwatch:ListMetrics",
            "ce:GetCostAndUsage",
            "ce:GetCostForecast",
            "rds:Describe*",
            "s3:ListAllMyBuckets",
            "s3:GetBucketLocation",
            "sts:GetCallerIdentity",
          ],
          Resource: "*",
        },
      ],
    },
    null,
    2,
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-text-muted font-mono mb-2">Trust policy</p>
        <CodeBlock code={trustPolicy} ariaLabel="Trust policy JSON" />
      </div>
      <div>
        <p className="text-sm text-text-muted font-mono mb-2">Inline permissions policy</p>
        <CodeBlock code={permissionsPolicy} ariaLabel="Permissions policy JSON" />
      </div>
    </div>
  );
}

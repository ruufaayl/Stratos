import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "./code-block";

const TRUST_POLICY = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: "arn:aws:iam::000000000000:role/StratosTest",
        },
        Action: "sts:AssumeRole",
        Condition: {
          StringEquals: {
            "sts:ExternalId": "stratos-test1234",
          },
        },
      },
    ],
  },
  null,
  2,
);

const INLINE_POLICY = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "cloudwatch:GetMetricStatistics",
          "ec2:DescribeInstances",
          "ec2:DescribeRegions",
          "rds:DescribeDBInstances",
          "s3:ListAllMyBuckets",
          "iam:GetUser",
          "sts:GetCallerIdentity",
        ],
        Resource: "*",
      },
    ],
  },
  null,
  2,
);

const meta: Meta<typeof CodeBlock> = {
  title: "ConnectAWS/CodeBlock",
  component: CodeBlock,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  args: {
    language: "json",
  },
};
export default meta;

type Story = StoryObj<typeof CodeBlock>;

/** Trust policy JSON — the IAM trust relationship document. */
export const TrustPolicy: Story = {
  args: {
    code: TRUST_POLICY,
    language: "json",
    ariaLabel: "IAM trust policy JSON",
  },
};

/** Inline policy JSON — the read-only permissions grant. */
export const InlinePolicy: Story = {
  args: {
    code: INLINE_POLICY,
    language: "json",
    ariaLabel: "IAM inline policy JSON",
  },
};

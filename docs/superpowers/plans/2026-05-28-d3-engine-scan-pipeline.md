# D3 — Engine Integration + Scan Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user connects an AWS account, the system fetches real CloudWatch telemetry, runs the Python engine, persists findings to the DB, and the overview shows real scan results.

**Architecture:** Four focused AWS SDK helpers (pricing, assume-role, ec2-lister, cloudwatch-fetcher) feed a `runScan()` utility that calls the engine and writes to existing `runs` + `opportunities` tables. A `/api/scan` POST route wraps it. `/api/findings` returns org-scoped opportunities. The connect wizard gets three scan phases added to step-verifying. The overview page renders a findings summary when runs exist (D4 wires the full tabs UI).

**Tech Stack:** `@aws-sdk/client-ec2`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-sts` (all pre-installed), `lib/engine/client.ts` (existing analyze() function), Drizzle ORM + existing `runs` + `opportunities` schema, Vitest for unit tests.

**Spec source:** `docs/superpowers/specs/2026-05-25-wave-1-thinnest-journey.md` §4 Phase 3 + §5.

---

## Pre-flight context

D1 + D2 shipped. Existing pieces D3 builds on:

- `apps/web/lib/db/schema.ts` — `accounts`, `runs`, `opportunities` tables, all live. No new tables in D3.
- `apps/web/lib/aws/connect.ts` — `validateAwsRole()` does STS AssumeRole + GetCallerIdentity + DescribeRegions. D3 extracts the assume-role logic into its own module.
- `apps/web/lib/engine/client.ts` — `analyze(req: AnalyzeRequest): Promise<AnalyzeResponse>` POST to the Python engine.
- `apps/web/lib/engine/types.ts` — `TelemetryIn`, `AnalyzeRequest`, `AnalyzeResponse` Zod types.
- `apps/web/app/api/accounts/route.ts` — POST creates + validates an account. D3 does NOT modify this route; the scan trigger is wired in step-verifying.tsx instead.
- `apps/web/app/app/[org]/page.tsx` — shows "Scan queued" when accounts exist but no runs. D3 updates this to show a findings summary when runs exist.
- `apps/web/components/integrations/connect-aws/step-verifying.tsx` — currently fires POST /api/accounts and redirects. D3 extends it to fire POST /api/scan after the account is created.
- `engine/catalog.py` — AWS us-east-1 on-demand prices. D3 creates a TypeScript mirror.

**Architecture law:** Python owns truth. The engine computes every dollar. Claude may write `explanation` text but never computes numbers. Never expose CLERK_SECRET_KEY client-side.

---

## File structure

**Create:**
```
apps/web/
├── lib/aws/
│   ├── pricing.ts                      # TypeScript mirror of engine/catalog.py
│   ├── pricing.test.ts
│   ├── assume-role.ts                  # Dedicated STS AssumeRole helper for scans
│   ├── assume-role.test.ts
│   ├── ec2-lister.ts                   # List EC2 instances + pricing lookup
│   ├── ec2-lister.test.ts
│   ├── cloudwatch-fetcher.ts           # Fetch 14-day CPU metrics per instance
│   └── cloudwatch-fetcher.test.ts
├── lib/scan/
│   ├── run-scan.ts                     # Core orchestration: assume → list → fetch → analyze → persist
│   └── run-scan.test.ts
└── app/api/
    ├── scan/route.ts                   # POST /api/scan — thin wrapper over runScan()
    └── findings/route.ts               # GET /api/findings — org-scoped opportunities
```

**Modify:**
```
apps/web/
├── components/integrations/connect-aws/
│   ├── connect-aws-wizard-state.ts     # Add scan phases + SCAN_SUCCESS action
│   └── step-verifying.tsx              # Wire POST /api/scan after account creation
└── app/app/[org]/page.tsx              # Show findings summary when runs exist
```

---

## Phase D3.A — AWS SDK helpers

### Task 1: Pricing map (TypeScript mirror of engine/catalog.py)

**Files:**
- Create: `apps/web/lib/aws/pricing.ts`
- Create: `apps/web/lib/aws/pricing.test.ts`

The engine needs `hourly_cost` (USD/hr) for each EC2 instance. This is a TypeScript mirror of `engine/catalog.py`. Prices are AWS us-east-1 on-demand, Linux, January 2026.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/aws/pricing.test.ts
import { describe, it, expect } from "vitest";
import { PRICING, DEFAULT_HOURLY_USD, priceForType } from "./pricing";

describe("PRICING", () => {
  it("has t3.micro at $0.0104/hr", () => {
    expect(PRICING["t3.micro"]).toBe(0.0104);
  });

  it("has m5.xlarge at $0.192/hr", () => {
    expect(PRICING["m5.xlarge"]).toBe(0.192);
  });

  it("covers at least 18 instance types", () => {
    expect(Object.keys(PRICING).length).toBeGreaterThanOrEqual(18);
  });
});

describe("priceForType", () => {
  it("returns the exact price for a known type", () => {
    expect(priceForType("c5.large")).toBe(0.085);
  });

  it("returns DEFAULT_HOURLY_USD for an unknown type", () => {
    expect(priceForType("x1e.32xlarge")).toBe(DEFAULT_HOURLY_USD);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run lib/aws/pricing.test.ts
```
Expected: FAIL — "Cannot find module './pricing'"

- [ ] **Step 3: Implement pricing.ts**

```typescript
// apps/web/lib/aws/pricing.ts
/**
 * AWS EC2 on-demand hourly prices — TypeScript mirror of engine/catalog.py.
 * Prices: USD/hr, us-east-1, Linux, January 2026 reference.
 * ARCHITECTURE LAW: These values feed Python engine input only.
 *                   The engine owns all dollar arithmetic.
 */

export const PRICING: Record<string, number> = {
  // Burstable
  "t3.nano":    0.0052,
  "t3.micro":   0.0104,
  "t3.small":   0.0208,
  "t3.medium":  0.0416,
  "t3.large":   0.0832,
  "t3.xlarge":  0.1664,
  "t3.2xlarge": 0.3328,
  // General purpose
  "m5.large":    0.096,
  "m5.xlarge":   0.192,
  "m5.2xlarge":  0.384,
  "m5.4xlarge":  0.768,
  "m5.8xlarge":  1.536,
  // Compute optimized
  "c5.large":    0.085,
  "c5.xlarge":   0.170,
  "c5.2xlarge":  0.340,
  "c5.4xlarge":  0.680,
  // Memory optimized
  "r5.large":    0.126,
  "r5.xlarge":   0.252,
  "r5.2xlarge":  0.504,
};

/** Fallback price for instance types not in the catalog (m5.large rate). */
export const DEFAULT_HOURLY_USD = 0.096;

/** Returns the hourly on-demand price for an instance type, falling back to DEFAULT_HOURLY_USD. */
export function priceForType(instanceType: string): number {
  return PRICING[instanceType] ?? DEFAULT_HOURLY_USD;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run lib/aws/pricing.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/aws/pricing.ts apps/web/lib/aws/pricing.test.ts
git commit -m "d3: pricing map — TypeScript mirror of engine/catalog.py"
```

---

### Task 2: Assume-role helper for scans

**Files:**
- Create: `apps/web/lib/aws/assume-role.ts`
- Create: `apps/web/lib/aws/assume-role.test.ts`

`validateAwsRole()` in connect.ts already does AssumeRole, but its session is 900s (connection test only). Scans need a separate assume with 3600s duration and a different session name.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/aws/assume-role.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-sts", () => ({
  STSClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  AssumeRoleCommand: vi.fn((input: unknown) => input),
}));

import { assumeRole } from "./assume-role";

const TEST_CREDS = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

beforeEach(() => mockSend.mockReset());

describe("assumeRole", () => {
  it("returns credentials on success", async () => {
    mockSend.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: TEST_CREDS.accessKeyId,
        SecretAccessKey: TEST_CREDS.secretAccessKey,
        SessionToken: TEST_CREDS.sessionToken,
      },
    });

    const result = await assumeRole(
      "arn:aws:iam::123456789012:role/StratosReadOnly",
      "stratos-abc123",
    );

    expect(result).toEqual<AwsCredentials>(TEST_CREDS);
  });

  it("throws if credentials are missing from response", async () => {
    mockSend.mockResolvedValueOnce({ Credentials: null });
    await expect(
      assumeRole("arn:aws:iam::123456789012:role/StratosReadOnly", "stratos-abc123"),
    ).rejects.toThrow("AssumeRole returned no credentials");
  });

  it("propagates STS errors", async () => {
    mockSend.mockRejectedValueOnce(new Error("AccessDenied"));
    await expect(
      assumeRole("arn:aws:iam::123456789012:role/StratosReadOnly", "stratos-abc123"),
    ).rejects.toThrow("AccessDenied");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run lib/aws/assume-role.test.ts
```
Expected: FAIL — "Cannot find module './assume-role'"

- [ ] **Step 3: Implement assume-role.ts**

```typescript
// apps/web/lib/aws/assume-role.ts
/**
 * Assumes a cross-account IAM role and returns temporary credentials.
 *
 * Used by the scan pipeline (D3+). For the connection test (D2),
 * validateAwsRole() in connect.ts handles the shorter 900s session.
 *
 * ARCHITECTURE LAW: Read-only forever. This module never requests write scope.
 */

import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

/**
 * Assumes the given IAM role and returns temporary credentials valid for 1 hour.
 *
 * @param roleArn     e.g. "arn:aws:iam::123456789012:role/StratosReadOnly"
 * @param externalId  per-org HMAC from externalIdForOrg() — confused-deputy protection
 * @param sessionName defaults to "StratosScan"
 */
export async function assumeRole(
  roleArn: string,
  externalId: string,
  sessionName = "StratosScan",
): Promise<AwsCredentials> {
  const sts = new STSClient({ region: "us-east-1" });

  const result = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      ExternalId: externalId,
      DurationSeconds: 3600,
    }),
  );

  const creds = result.Credentials;
  if (
    !creds?.AccessKeyId ||
    !creds.SecretAccessKey ||
    !creds.SessionToken
  ) {
    throw new Error("AssumeRole returned no credentials");
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
  };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run lib/aws/assume-role.test.ts
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/aws/assume-role.ts apps/web/lib/aws/assume-role.test.ts
git commit -m "d3: assumeRole helper — dedicated STS assume for scan sessions"
```

---

### Task 3: EC2 instance lister

**Files:**
- Create: `apps/web/lib/aws/ec2-lister.ts`
- Create: `apps/web/lib/aws/ec2-lister.test.ts`

Lists all running + stopped EC2 instances in a region, attaches pricing from `pricing.ts`, handles pagination via `NextToken`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/aws/ec2-lister.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-ec2", () => ({
  EC2Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  DescribeInstancesCommand: vi.fn((input: unknown) => input),
}));

import { listEc2Instances } from "./ec2-lister";

const FAKE_CREDS: AwsCredentials = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

beforeEach(() => mockSend.mockReset());

describe("listEc2Instances", () => {
  it("returns instances with pricing from catalog", async () => {
    mockSend.mockResolvedValueOnce({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: "i-0abc123",
              InstanceType: "t3.medium",
              State: { Name: "running" },
              Tags: [{ Key: "Name", Value: "web-server" }],
            },
          ],
        },
      ],
      NextToken: undefined,
    });

    const result = await listEc2Instances(FAKE_CREDS, "us-east-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      instanceId: "i-0abc123",
      instanceType: "t3.medium",
      region: "us-east-1",
      state: "running",
      hourlyOnDemandUsd: 0.0416,
      tags: { Name: "web-server" },
    });
  });

  it("uses DEFAULT_HOURLY_USD for unknown instance types", async () => {
    mockSend.mockResolvedValueOnce({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: "i-0xyz999",
              InstanceType: "x1e.32xlarge",
              State: { Name: "stopped" },
              Tags: [],
            },
          ],
        },
      ],
      NextToken: undefined,
    });

    const result = await listEc2Instances(FAKE_CREDS, "eu-west-1");
    expect(result[0].hourlyOnDemandUsd).toBe(0.096);
  });

  it("follows NextToken pagination", async () => {
    mockSend
      .mockResolvedValueOnce({
        Reservations: [
          { Instances: [{ InstanceId: "i-1", InstanceType: "t3.micro", State: { Name: "running" }, Tags: [] }] },
        ],
        NextToken: "page2",
      })
      .mockResolvedValueOnce({
        Reservations: [
          { Instances: [{ InstanceId: "i-2", InstanceType: "t3.micro", State: { Name: "running" }, Tags: [] }] },
        ],
        NextToken: undefined,
      });

    const result = await listEc2Instances(FAKE_CREDS, "us-east-1");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.instanceId)).toEqual(["i-1", "i-2"]);
  });

  it("skips instances missing InstanceId or InstanceType", async () => {
    mockSend.mockResolvedValueOnce({
      Reservations: [
        {
          Instances: [
            { InstanceId: undefined, InstanceType: "t3.micro", State: { Name: "running" }, Tags: [] },
            { InstanceId: "i-valid", InstanceType: undefined, State: { Name: "running" }, Tags: [] },
          ],
        },
      ],
      NextToken: undefined,
    });

    const result = await listEc2Instances(FAKE_CREDS, "us-east-1");
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run lib/aws/ec2-lister.test.ts
```
Expected: FAIL — "Cannot find module './ec2-lister'"

- [ ] **Step 3: Implement ec2-lister.ts**

```typescript
// apps/web/lib/aws/ec2-lister.ts
/**
 * Lists EC2 instances in a single region using assumed-role credentials.
 * Handles DescribeInstances pagination (NextToken).
 * Attaches on-demand pricing from the TypeScript catalog.
 *
 * ARCHITECTURE LAW: Read-only. ec2:Describe* permissions only.
 */

import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import type { AwsCredentials } from "./assume-role";
import { priceForType } from "./pricing";

export interface Ec2InstanceInfo {
  instanceId: string;
  instanceType: string;
  region: string;
  state: string;
  hourlyOnDemandUsd: number;
  tags: Record<string, string>;
}

/**
 * Returns all running + stopped EC2 instances in the given region.
 * Stopped instances are included because the idle/zombie algorithms use
 * their metrics to confirm the resource is genuinely dormant.
 */
export async function listEc2Instances(
  credentials: AwsCredentials,
  region: string,
): Promise<Ec2InstanceInfo[]> {
  const ec2 = new EC2Client({ region, credentials });
  const instances: Ec2InstanceInfo[] = [];
  let nextToken: string | undefined;

  do {
    const res = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          { Name: "instance-state-name", Values: ["running", "stopped"] },
        ],
        NextToken: nextToken,
      }),
    );

    for (const reservation of res.Reservations ?? []) {
      for (const inst of reservation.Instances ?? []) {
        if (!inst.InstanceId || !inst.InstanceType) continue;

        const tags: Record<string, string> = {};
        for (const tag of inst.Tags ?? []) {
          if (tag.Key && tag.Value) tags[tag.Key] = tag.Value;
        }

        instances.push({
          instanceId: inst.InstanceId,
          instanceType: inst.InstanceType,
          region,
          state: inst.State?.Name ?? "unknown",
          hourlyOnDemandUsd: priceForType(inst.InstanceType),
          tags,
        });
      }
    }

    nextToken = res.NextToken;
  } while (nextToken);

  return instances;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run lib/aws/ec2-lister.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/aws/ec2-lister.ts apps/web/lib/aws/ec2-lister.test.ts
git commit -m "d3: ec2-lister — list EC2 instances with pricing lookup"
```

---

### Task 4: CloudWatch metrics fetcher

**Files:**
- Create: `apps/web/lib/aws/cloudwatch-fetcher.ts`
- Create: `apps/web/lib/aws/cloudwatch-fetcher.test.ts`

Fetches 14 days of CPU utilization per instance (30-minute periods, 672 points). Period 1800s keeps points ≤ 672, well under the CloudWatch 1440-point limit for GetMetricStatistics.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/aws/cloudwatch-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";
import type { Ec2InstanceInfo } from "./ec2-lister";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  GetMetricStatisticsCommand: vi.fn((input: unknown) => input),
}));

import { fetchInstanceTelemetry } from "./cloudwatch-fetcher";

const FAKE_CREDS: AwsCredentials = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

const FAKE_INSTANCE: Ec2InstanceInfo = {
  instanceId: "i-0abc123",
  instanceType: "t3.medium",
  region: "us-east-1",
  state: "running",
  hourlyOnDemandUsd: 0.0416,
  tags: { Name: "web-server" },
};

beforeEach(() => mockSend.mockReset());

describe("fetchInstanceTelemetry", () => {
  it("returns telemetry with sorted cpu array", async () => {
    const t1 = new Date("2026-05-01T00:00:00Z");
    const t2 = new Date("2026-05-01T00:30:00Z");
    const t3 = new Date("2026-05-01T01:00:00Z");

    // Return datapoints out of order — fetcher must sort by Timestamp
    mockSend.mockResolvedValueOnce({
      Datapoints: [
        { Timestamp: t3, Average: 30.0 },
        { Timestamp: t1, Average: 10.0 },
        { Timestamp: t2, Average: 20.0 },
      ],
    });

    const result = await fetchInstanceTelemetry(FAKE_CREDS, [FAKE_INSTANCE]);

    expect(result).toHaveLength(1);
    expect(result[0].instanceId).toBe("i-0abc123");
    expect(result[0].cpu).toEqual([10.0, 20.0, 30.0]);
    expect(result[0].instanceType).toBe("t3.medium");
    expect(result[0].hourlyOnDemandUsd).toBe(0.0416);
  });

  it("returns empty cpu array when no datapoints exist", async () => {
    mockSend.mockResolvedValueOnce({ Datapoints: [] });

    const result = await fetchInstanceTelemetry(FAKE_CREDS, [FAKE_INSTANCE]);
    expect(result[0].cpu).toEqual([]);
  });

  it("uses 0 for datapoints with no Average value", async () => {
    mockSend.mockResolvedValueOnce({
      Datapoints: [{ Timestamp: new Date(), Average: undefined }],
    });

    const result = await fetchInstanceTelemetry(FAKE_CREDS, [FAKE_INSTANCE]);
    expect(result[0].cpu).toEqual([0]);
  });

  it("calls GetMetricStatistics once per instance", async () => {
    mockSend.mockResolvedValue({ Datapoints: [] });
    const instances: Ec2InstanceInfo[] = [
      { ...FAKE_INSTANCE, instanceId: "i-1" },
      { ...FAKE_INSTANCE, instanceId: "i-2" },
    ];

    await fetchInstanceTelemetry(FAKE_CREDS, instances);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run lib/aws/cloudwatch-fetcher.test.ts
```
Expected: FAIL — "Cannot find module './cloudwatch-fetcher'"

- [ ] **Step 3: Implement cloudwatch-fetcher.ts**

```typescript
// apps/web/lib/aws/cloudwatch-fetcher.ts
/**
 * Fetches 14-day CPU utilization metrics per EC2 instance via CloudWatch.
 *
 * Uses GetMetricStatistics with:
 *   Period: 1800s (30-min intervals) → 672 points over 14 days.
 *   672 << 1440 CW limit, so no pagination needed.
 *
 * ARCHITECTURE LAW: Read-only. cloudwatch:GetMetricStatistics only.
 *                   Only collects CPU for Wave 1. Network/mem = Wave 2.
 */

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";
import type { AwsCredentials } from "./assume-role";
import type { Ec2InstanceInfo } from "./ec2-lister";

export interface InstanceTelemetry {
  instanceId: string;
  instanceType: string;
  region: string;
  hourlyOnDemandUsd: number;
  tags: Record<string, string>;
  /** CPU utilization % per 30-min interval, sorted oldest → newest. */
  cpu: number[];
}

const PERIOD_SECONDS = 1800; // 30 minutes
const DAYS_LOOKBACK = 14;

/**
 * Fetches CPU telemetry for each instance. Sequential calls per instance —
 * Wave 1 cap is ~5 instances; parallel batching added in Wave 2.
 */
export async function fetchInstanceTelemetry(
  credentials: AwsCredentials,
  instances: Ec2InstanceInfo[],
): Promise<InstanceTelemetry[]> {
  if (instances.length === 0) return [];

  // All instances must be in the same region (enforced by the scan pipeline).
  const region = instances[0]!.region;
  const cw = new CloudWatchClient({ region, credentials });

  const endTime = new Date();
  const startTime = new Date(
    endTime.getTime() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000,
  );

  const results: InstanceTelemetry[] = [];

  for (const inst of instances) {
    const res = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: "AWS/EC2",
        MetricName: "CPUUtilization",
        Dimensions: [{ Name: "InstanceId", Value: inst.instanceId }],
        StartTime: startTime,
        EndTime: endTime,
        Period: PERIOD_SECONDS,
        Statistics: ["Average"],
      }),
    );

    // Sort by Timestamp ascending (CW returns datapoints in unspecified order)
    const sorted = (res.Datapoints ?? []).sort(
      (a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0),
    );

    const cpu = sorted.map((dp) => dp.Average ?? 0);

    results.push({
      instanceId: inst.instanceId,
      instanceType: inst.instanceType,
      region: inst.region,
      hourlyOnDemandUsd: inst.hourlyOnDemandUsd,
      tags: inst.tags,
      cpu,
    });
  }

  return results;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run lib/aws/cloudwatch-fetcher.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/aws/cloudwatch-fetcher.ts apps/web/lib/aws/cloudwatch-fetcher.test.ts
git commit -m "d3: cloudwatch-fetcher — 14-day CPU telemetry per EC2 instance"
```

---

## Phase D3.B — Scan pipeline core

### Task 5: runScan() — core orchestration function

**Files:**
- Create: `apps/web/lib/scan/run-scan.ts`
- Create: `apps/web/lib/scan/run-scan.test.ts`

This is the heart of D3. `runScan()` wires: assume role → list EC2 → fetch CW → engine analyze → persist runs/opportunities → update account.lastScanAt. It's not an API route itself — that thin wrapper lives in Task 6. Keeping the logic separate from the route makes it testable without Next.js mocking.

The existing `runs` + `opportunities` tables from `schema.ts` are used (not new tables). No schema migration needed.

A 120s timeout guard is implemented via `Promise.race`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/scan/run-scan.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AWS helpers
vi.mock("@/lib/aws/assume-role", () => ({
  assumeRole: vi.fn(),
}));
vi.mock("@/lib/aws/ec2-lister", () => ({
  listEc2Instances: vi.fn(),
}));
vi.mock("@/lib/aws/cloudwatch-fetcher", () => ({
  fetchInstanceTelemetry: vi.fn(),
}));
// Mock engine client
vi.mock("@/lib/engine/client", () => ({
  analyze: vi.fn(),
}));
// Mock DB
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
  schema: {
    runs: {},
    opportunities: {},
    accounts: {},
  },
}));

import { assumeRole } from "@/lib/aws/assume-role";
import { listEc2Instances } from "@/lib/aws/ec2-lister";
import { fetchInstanceTelemetry } from "@/lib/aws/cloudwatch-fetcher";
import { analyze } from "@/lib/engine/client";
import { db } from "@/lib/db";
import { runScan } from "./run-scan";

const MOCK_ACCOUNT = {
  id: "acc-uuid-1",
  orgId: "org_abc",
  roleArn: "arn:aws:iam::123456789012:role/StratosReadOnly",
  externalId: "stratos-abc123",
  region: "us-east-1",
};

const MOCK_CREDS = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

const MOCK_INSTANCES = [
  {
    instanceId: "i-0abc",
    instanceType: "t3.xlarge",
    region: "us-east-1",
    state: "running",
    hourlyOnDemandUsd: 0.1664,
    tags: {},
  },
];

const MOCK_TELEMETRY = [
  {
    instanceId: "i-0abc",
    instanceType: "t3.xlarge",
    region: "us-east-1",
    hourlyOnDemandUsd: 0.1664,
    tags: {},
    cpu: new Array(672).fill(2.0), // persistently low CPU → idle
  },
];

const MOCK_ENGINE_RESULT = {
  resource_count: 1,
  opportunity_count: 1,
  total_monthly_waste: 121.47,
  opportunities: [
    {
      kind: "idle" as const,
      resource_id: "i-0abc",
      resource_type: "t3.xlarge",
      monthly_savings: 121.47,
      risk: 0.1,
      idle_score: 0.95,
      peak_cpu_pct: 2.0,
      peak_net_bps: null,
      monthly_cost: 121.47,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(assumeRole).mockResolvedValue(MOCK_CREDS);
  vi.mocked(listEc2Instances).mockResolvedValue(MOCK_INSTANCES);
  vi.mocked(fetchInstanceTelemetry).mockResolvedValue(MOCK_TELEMETRY);
  vi.mocked(analyze).mockResolvedValue(MOCK_ENGINE_RESULT);

  // DB chain mocks
  const insertMock = { values: vi.fn().mockReturnThis(), returning: vi.fn() };
  const updateMock = { set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
  vi.mocked(db.insert).mockReturnValue(insertMock as never);
  vi.mocked(db.update).mockReturnValue(updateMock as never);
  insertMock.returning.mockResolvedValue([{ id: "run-uuid-1" }]);
});

describe("runScan", () => {
  it("returns succeeded status with finding count + savings cents", async () => {
    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(result.totalFindings).toBe(1);
    expect(result.totalSavingsCents).toBe(12147); // 121.47 * 100, rounded
    expect(result.runId).toBe("run-uuid-1");
  });

  it("calls assumeRole with the account roleArn + externalId", async () => {
    await runScan(MOCK_ACCOUNT);
    expect(assumeRole).toHaveBeenCalledWith(
      MOCK_ACCOUNT.roleArn,
      MOCK_ACCOUNT.externalId,
      "StratosScan",
    );
  });

  it("calls listEc2Instances with assumed credentials + region", async () => {
    await runScan(MOCK_ACCOUNT);
    expect(listEc2Instances).toHaveBeenCalledWith(MOCK_CREDS, MOCK_ACCOUNT.region);
  });

  it("returns succeeded with 0 findings when account has no instances", async () => {
    vi.mocked(listEc2Instances).mockResolvedValue([]);

    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(result.totalFindings).toBe(0);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("returns failed status on engine error", async () => {
    vi.mocked(analyze).mockRejectedValue(new Error("engine unreachable"));

    const result = await runScan(MOCK_ACCOUNT);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("engine unreachable");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run lib/scan/run-scan.test.ts
```
Expected: FAIL — "Cannot find module './run-scan'"

- [ ] **Step 3: Implement run-scan.ts**

```typescript
// apps/web/lib/scan/run-scan.ts
/**
 * Core scan orchestration function.
 *
 * Sequence:
 *   1. Create runs row (status: "running")
 *   2. Assume IAM role
 *   3. List EC2 instances in account's region
 *   4. Fetch 14-day CloudWatch CPU metrics
 *   5. Filter to instances with ≥48 datapoints (≥1 day at 30-min resolution)
 *   6. POST telemetry to engine /analyze
 *   7. Persist opportunities to DB
 *   8. Mark run succeeded + update account.lastScanAt
 *
 * A 120-second timeout guards against hanging AWS calls.
 * On timeout or any error: run row is marked "failed".
 *
 * ARCHITECTURE LAW: Python engine owns all dollar arithmetic.
 *                   This function feeds input and persists output.
 */

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assumeRole } from "@/lib/aws/assume-role";
import { listEc2Instances } from "@/lib/aws/ec2-lister";
import { fetchInstanceTelemetry } from "@/lib/aws/cloudwatch-fetcher";
import { analyze } from "@/lib/engine/client";

export interface ScanInput {
  id: string;          // account UUID
  orgId: string;
  roleArn: string;
  externalId: string;
  region: string;
}

export interface ScanResult {
  runId: string;
  status: "succeeded" | "failed";
  totalFindings: number;
  totalSavingsCents: number;
  error?: string;
}

const SCAN_TIMEOUT_MS = 120_000;
const MIN_DATAPOINTS = 48; // at least 1 day of 30-min data

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Scan timed out after ${ms / 1000}s`)), ms),
  );
  return Promise.race([promise, timeout]);
}

export async function runScan(account: ScanInput): Promise<ScanResult> {
  // 1. Create run record
  const insertedRuns = await db
    .insert(schema.runs)
    .values({ accountId: account.id, status: "running" })
    .returning({ id: schema.runs.id });

  const run = insertedRuns[0];
  if (!run) throw new Error("Failed to create run row");

  const runId = run.id;

  async function markFailed(message: string): Promise<ScanResult> {
    await db
      .update(schema.runs)
      .set({ finishedAt: new Date(), status: "failed" })
      .where(eq(schema.runs.id, runId));
    return { runId, status: "failed", totalFindings: 0, totalSavingsCents: 0, error: message };
  }

  try {
    return await withTimeout(
      (async (): Promise<ScanResult> => {
        // 2. Assume IAM role
        const credentials = await assumeRole(
          account.roleArn,
          account.externalId,
          "StratosScan",
        );

        // 3. List EC2 instances
        const instances = await listEc2Instances(credentials, account.region);

        if (instances.length === 0) {
          await db
            .update(schema.runs)
            .set({
              finishedAt: new Date(),
              status: "succeeded",
              totalMonthlyWaste: "0",
              resourceCount: 0,
              opportunityCount: 0,
            })
            .where(eq(schema.runs.id, runId));
          await db
            .update(schema.accounts)
            .set({ lastScanAt: new Date() })
            .where(eq(schema.accounts.id, account.id));
          return { runId, status: "succeeded", totalFindings: 0, totalSavingsCents: 0 };
        }

        // 4. Fetch CloudWatch metrics
        const telemetry = await fetchInstanceTelemetry(credentials, instances);

        // 5. Filter to instances with enough history for the engine
        const resources = telemetry
          .filter((t) => t.cpu.length >= MIN_DATAPOINTS)
          .map((t) => ({
            resource_id: t.instanceId,
            service: "EC2",
            resource_type: t.instanceType,
            region: t.region,
            cpu: t.cpu,
            hourly_cost: t.hourlyOnDemandUsd,
            tags: t.tags,
          }));

        if (resources.length === 0) {
          // All instances are too new — no history yet
          await db
            .update(schema.runs)
            .set({
              finishedAt: new Date(),
              status: "succeeded",
              totalMonthlyWaste: "0",
              resourceCount: instances.length,
              opportunityCount: 0,
            })
            .where(eq(schema.runs.id, runId));
          await db
            .update(schema.accounts)
            .set({ lastScanAt: new Date() })
            .where(eq(schema.accounts.id, account.id));
          return { runId, status: "succeeded", totalFindings: 0, totalSavingsCents: 0 };
        }

        // 6. Call engine — Python owns all dollar math
        const result = await analyze({ resources });

        // 7. Persist opportunities
        if (result.opportunities.length > 0) {
          await db.insert(schema.opportunities).values(
            result.opportunities.map((o) => {
              const resourceId =
                "resource_id" in o && typeof o.resource_id === "string"
                  ? o.resource_id
                  : null;
              return {
                runId,
                accountId: account.id,
                kind: o.kind,
                resourceId,
                monthlySavings: String(o.monthly_savings),
                risk: o.risk !== undefined ? String(o.risk) : null,
                engineData: o as Record<string, unknown>,
              };
            }),
          );
        }

        const totalSavingsCents = Math.round(result.total_monthly_waste * 100);

        // 8. Mark run succeeded + update account
        await db
          .update(schema.runs)
          .set({
            finishedAt: new Date(),
            status: "succeeded",
            totalMonthlyWaste: String(result.total_monthly_waste),
            resourceCount: result.resource_count,
            opportunityCount: result.opportunity_count,
            engineRaw: result as Record<string, unknown>,
          })
          .where(eq(schema.runs.id, runId));

        await db
          .update(schema.accounts)
          .set({ lastScanAt: new Date() })
          .where(eq(schema.accounts.id, account.id));

        return {
          runId,
          status: "succeeded",
          totalFindings: result.opportunity_count,
          totalSavingsCents,
        };
      })(),
      SCAN_TIMEOUT_MS,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scan error";
    return markFailed(message);
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run lib/scan/run-scan.test.ts
```
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/scan/run-scan.ts apps/web/lib/scan/run-scan.test.ts
git commit -m "d3: runScan() — core orchestration: assume → list → fetch → analyze → persist"
```

---

## Phase D3.C — API routes

### Task 6: POST /api/scan route

**Files:**
- Create: `apps/web/app/api/scan/route.ts`
- Create: `apps/web/app/api/scan/route.test.ts`

Thin wrapper over `runScan()`. Auth + org scope + account ownership check, then delegates to `runScan`. `export const dynamic = "force-dynamic"` prevents Next.js from pre-rendering.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/app/api/scan/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  and: vi.fn((...args) => ({ _and: args })),
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  },
  schema: {
    accounts: { id: "accounts.id", orgId: "accounts.orgId" },
  },
}));
vi.mock("@/lib/scan/run-scan", () => ({
  runScan: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { runScan } from "@/lib/scan/run-scan";
import { POST } from "./route";

const MOCK_ACCOUNT = {
  id: "acc-1",
  orgId: "org_1",
  roleArn: "arn:aws:iam::123456789012:role/R",
  externalId: "stratos-abc",
  region: "us-east-1",
  clerkUserId: "user_1",
  name: "prod",
  provider: "aws",
  awsAccountId: "123456789012",
  status: "validated",
  lastScanAt: null,
  config: {},
  tier: "free",
  stripeCustomerId: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" } as never);
  vi.mocked(db.limit).mockResolvedValue([MOCK_ACCOUNT]);
  vi.mocked(runScan).mockResolvedValue({
    runId: "run-1",
    status: "succeeded",
    totalFindings: 3,
    totalSavingsCents: 50000,
  });
});

function makeReq(body: unknown) {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scan", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const res = await POST(makeReq({ accountId: "acc-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when orgId missing", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: null } as never);
    const res = await POST(makeReq({ accountId: "acc-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(makeReq({ accountId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when account not found or not in org", async () => {
    vi.mocked(db.limit).mockResolvedValue([]);
    const res = await POST(makeReq({ accountId: "acc-1" }));
    expect(res.status).toBe(404);
  });

  it("returns scan result on success", async () => {
    const res = await POST(makeReq({ accountId: "acc-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runId).toBe("run-1");
    expect(body.totalFindings).toBe(3);
    expect(body.totalSavingsCents).toBe(50000);
  });

  it("returns 502 when scan fails", async () => {
    vi.mocked(runScan).mockResolvedValue({
      runId: "run-1",
      status: "failed",
      totalFindings: 0,
      totalSavingsCents: 0,
      error: "engine unreachable",
    });
    const res = await POST(makeReq({ accountId: "acc-1" }));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run app/api/scan/route.test.ts
```
Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Implement the scan route**

```typescript
// apps/web/app/api/scan/route.ts
/**
 * POST /api/scan
 * Triggers a scan for the given account (org-scoped, auth-gated).
 *
 * Body: { accountId: string }
 * Returns: { runId, status, totalFindings, totalSavingsCents } | { error }
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { runScan } from "@/lib/scan/run-scan";

export const dynamic = "force-dynamic";

const ScanBody = z.object({
  accountId: z.string().uuid("accountId must be a UUID"),
});

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Active organization required." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ScanBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { accountId } = parsed.data;

  // Load account — verifies it belongs to the active org
  const rows = await db
    .select()
    .from(schema.accounts)
    .where(and(eq(schema.accounts.id, accountId), eq(schema.accounts.orgId, orgId)))
    .limit(1);

  const account = rows[0];
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (!account.roleArn || !account.externalId) {
    return NextResponse.json(
      { error: "Account has no IAM role configured." },
      { status: 400 },
    );
  }

  const result = await runScan({
    id: account.id,
    orgId: account.orgId,
    roleArn: account.roleArn,
    externalId: account.externalId,
    region: account.region,
  });

  if (result.status === "failed") {
    return NextResponse.json(
      { runId: result.runId, error: result.error ?? "Scan failed." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    runId: result.runId,
    status: result.status,
    totalFindings: result.totalFindings,
    totalSavingsCents: result.totalSavingsCents,
  });
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run app/api/scan/route.test.ts
```
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/scan/route.ts apps/web/app/api/scan/route.test.ts
git commit -m "d3: POST /api/scan — thin wrapper over runScan(), org-scoped + auth-gated"
```

---

### Task 7: GET /api/findings route

**Files:**
- Create: `apps/web/app/api/findings/route.ts`
- Create: `apps/web/app/api/findings/route.test.ts`

Returns org-scoped opportunities (newest first, limit 50). This replaces the stub at `apps/web/app/api/findings/search/route.ts` which remains for the command-bar search flow.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/app/api/findings/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  desc: vi.fn((a) => ({ _desc: a })),
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  },
  schema: {
    opportunities: { id: "opp.id", kind: "opp.kind", accountId: "opp.accountId" },
    accounts: { id: "acc.id", orgId: "acc.orgId" },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { GET } from "./route";

const MOCK_FINDINGS = [
  {
    id: "opp-1",
    kind: "idle",
    resourceId: "i-0abc",
    monthlySavings: "121.47",
    risk: "0.1",
    engineData: { kind: "idle", monthly_savings: 121.47 },
    explanation: null,
    createdAt: new Date("2026-05-28"),
    accountId: "acc-1",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: "org_1" } as never);
  vi.mocked(db.limit).mockResolvedValue(MOCK_FINDINGS);
});

function makeReq() {
  return new Request("http://localhost/api/findings");
}

describe("GET /api/findings", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 when no active org", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: null } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("returns findings array on success", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.findings).toHaveLength(1);
    expect(body.findings[0].id).toBe("opp-1");
  });

  it("returns empty array when no findings exist", async () => {
    vi.mocked(db.limit).mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.findings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm test:run app/api/findings/route.test.ts
```
Expected: FAIL — "Cannot find module './route'" (there's no `route.ts` at this path — `search/route.ts` is the only one)

- [ ] **Step 3: Implement findings route**

```typescript
// apps/web/app/api/findings/route.ts
/**
 * GET /api/findings
 * Returns the most recent 50 opportunities for the active organisation.
 * Ordered by createdAt descending — newest findings first.
 *
 * Used by the overview page tabs and the React Query cache.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Active organization required." }, { status: 400 });
  }

  const findings = await db
    .select({
      id: schema.opportunities.id,
      kind: schema.opportunities.kind,
      resourceId: schema.opportunities.resourceId,
      monthlySavings: schema.opportunities.monthlySavings,
      risk: schema.opportunities.risk,
      engineData: schema.opportunities.engineData,
      explanation: schema.opportunities.explanation,
      createdAt: schema.opportunities.createdAt,
      accountId: schema.opportunities.accountId,
    })
    .from(schema.opportunities)
    .innerJoin(
      schema.accounts,
      eq(schema.opportunities.accountId, schema.accounts.id),
    )
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.opportunities.createdAt))
    .limit(50);

  return NextResponse.json({ findings });
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm test:run app/api/findings/route.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/findings/route.ts apps/web/app/api/findings/route.test.ts
git commit -m "d3: GET /api/findings — org-scoped opportunities endpoint"
```

---

## Phase D3.D — Wizard integration

### Task 8: Wire scan phases into the connect wizard

**Files:**
- Modify: `apps/web/components/integrations/connect-aws/connect-aws-wizard-state.ts`
- Modify: `apps/web/components/integrations/connect-aws/step-verifying.tsx`
- Modify: `apps/web/components/integrations/connect-aws/connect-aws-wizard.test.tsx` (add scan phase tests)

After account creation (POST /api/accounts) succeeds, step-verifying fires POST /api/scan and advances through three new scan phases: `"listing"`, `"fetching"`, `"analyzing"`. When the scan completes, it dispatches `SCAN_SUCCESS` and the wizard transitions to `"done"` and redirects.

The animation runs on a timer while the real scan awaits — if the scan finishes before the animation completes, the wizard jumps straight to `"done"`.

**Do not change the `skipEffect` prop contract** — it continues to block ALL effects so Storybook stories remain noise-free.

- [ ] **Step 1: Write failing tests for the new state machine transitions**

Open `apps/web/components/integrations/connect-aws/connect-aws-wizard.test.tsx` and ADD these test cases to the existing test suite (do not delete existing tests):

```typescript
// ADD to the describe("reducer") block in connect-aws-wizard.test.tsx:

describe("scan phases", () => {
  it("SCAN_SUCCESS transitions done→done with scan result", () => {
    const state: WizardState = {
      ...initialState,
      step: 4,
      phase: "done",
      accountId: "acc-1",
      awsAccountId: "123456789012",
    };
    const next = reducer(state, {
      type: "SCAN_SUCCESS",
      totalFindings: 5,
      totalSavingsCents: 60000,
    });
    expect(next.phase).toBe("done");
    expect(next.scanResult).toEqual({ totalFindings: 5, totalSavingsCents: 60000 });
  });

  it("PHASE can transition to listing, fetching, analyzing", () => {
    const base: WizardState = { ...initialState, step: 4, phase: "persisting" };
    const s1 = reducer(base, { type: "PHASE", phase: "listing" });
    expect(s1.phase).toBe("listing");
    const s2 = reducer(s1, { type: "PHASE", phase: "fetching" });
    expect(s2.phase).toBe("fetching");
    const s3 = reducer(s2, { type: "PHASE", phase: "analyzing" });
    expect(s3.phase).toBe("analyzing");
  });

  it("SCAN_ERROR sets phase to error with message", () => {
    const state: WizardState = {
      ...initialState,
      step: 4,
      phase: "analyzing",
    };
    const next = reducer(state, {
      type: "SCAN_ERROR",
      message: "engine unreachable",
    });
    expect(next.phase).toBe("error");
    expect(next.errorMessage).toBe("engine unreachable");
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd apps/web && pnpm test:run components/integrations/connect-aws/connect-aws-wizard.test.tsx
```
Expected: FAIL on the 3 new tests.

- [ ] **Step 3: Update connect-aws-wizard-state.ts**

Replace the entire file content:

```typescript
// apps/web/components/integrations/connect-aws/connect-aws-wizard-state.ts
/** Pure types + reducer + initialState — no React import. */

export type Phase =
  | "idle"
  | "assuming"
  | "identity"
  | "regions"
  | "persisting"
  | "listing"      // scan: listing EC2 instances
  | "fetching"     // scan: fetching CloudWatch metrics
  | "analyzing"    // scan: calling engine
  | "done"
  | "error";

export interface ScanResult {
  totalFindings: number;
  totalSavingsCents: number;
}

export type WizardState = {
  step: 1 | 2 | 3 | 4;
  name: string;
  roleArn: string;
  region: string;
  phase: Phase;
  /** Populated after POST /api/accounts succeeds */
  accountId: string;
  awsAccountId: string;
  errorMessage: string;
  /** Populated after POST /api/scan succeeds */
  scanResult?: ScanResult;
};

export const initialState: WizardState = {
  step: 1,
  name: "",
  roleArn: "",
  region: "us-east-1",
  phase: "idle",
  accountId: "",
  awsAccountId: "",
  errorMessage: "",
};

const ARN_REGEX = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/;

export type Action =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_ROLE_ARN"; value: string }
  | { type: "SET_REGION"; value: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GOTO_STEP"; step: 1 | 2 | 3 | 4 }
  | { type: "PHASE"; phase: Phase }
  | { type: "SUCCESS"; accountId: string; awsAccountId: string }
  | { type: "SCAN_SUCCESS"; totalFindings: number; totalSavingsCents: number }
  | { type: "SCAN_ERROR"; message: string };

export function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.value };

    case "SET_ROLE_ARN":
      return { ...state, roleArn: action.value };

    case "SET_REGION":
      return { ...state, region: action.value };

    case "NEXT_STEP": {
      if (state.step === 1 && !state.name.trim()) return state;
      if (state.step === 3 && !ARN_REGEX.test(state.roleArn)) return state;
      if (state.step === 4) return state;
      return { ...state, step: ((state.step + 1) as 1 | 2 | 3 | 4) };
    }

    case "PREV_STEP": {
      if (state.step === 1) return state;
      return { ...state, step: ((state.step - 1) as 1 | 2 | 3 | 4) };
    }

    case "GOTO_STEP":
      return { ...state, step: action.step };

    case "PHASE": {
      if (state.step !== 4) return state;
      return { ...state, phase: action.phase, errorMessage: "" };
    }

    case "SUCCESS": {
      if (state.phase !== "persisting") return state;
      return {
        ...state,
        phase: "listing",          // advance into scan phases immediately
        accountId: action.accountId,
        awsAccountId: action.awsAccountId,
      };
    }

    case "SCAN_SUCCESS": {
      return {
        ...state,
        phase: "done",
        scanResult: {
          totalFindings: action.totalFindings,
          totalSavingsCents: action.totalSavingsCents,
        },
      };
    }

    case "SCAN_ERROR": {
      return { ...state, phase: "error", errorMessage: action.message };
    }

    default:
      return state;
  }
}
```

**Key change from before:** `SUCCESS` now transitions to `"listing"` instead of `"done"`. The wizard stays on step 4 through scan phases. `"done"` only fires via `SCAN_SUCCESS`.

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
cd apps/web && pnpm test:run components/integrations/connect-aws/connect-aws-wizard.test.tsx
```
Expected: ALL PASS (including existing tests + 3 new ones).

- [ ] **Step 5: Update step-verifying.tsx**

Replace the entire file content:

```tsx
// apps/web/components/integrations/connect-aws/step-verifying.tsx
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
   * prop), both useEffects are skipped. This prevents network noise in
   * Storybook while still rendering the visual state driven by `state`.
   */
  skipEffect?: boolean;
};

// Phase 1 — account connection (POST /api/accounts)
type ConnectPhase = "assuming" | "identity" | "regions" | "persisting";
const CONNECT_PHASES: ConnectPhase[] = ["assuming", "identity", "regions", "persisting"];

// Phase 2 — engine scan (POST /api/scan)
type ScanPhase = "listing" | "fetching" | "analyzing";
const SCAN_PHASES: ScanPhase[] = ["listing", "fetching", "analyzing"];

const PHASE_LABELS: Record<ConnectPhase | ScanPhase, string> = {
  assuming:   "Assuming role",
  identity:   "Verifying identity",
  regions:    "Discovering regions",
  persisting: "Saving connection",
  listing:    "Listing instances",
  fetching:   "Fetching metrics",
  analyzing:  "Analyzing",
};

const ALL_PHASES = [...CONNECT_PHASES, ...SCAN_PHASES] as const;
type AllPhase = ConnectPhase | ScanPhase;

function phaseIndex(phase: Phase): number {
  return ALL_PHASES.indexOf(phase as AllPhase);
}

export function StepVerifying({ state, dispatch, orgSlug, skipEffect }: Props) {
  const router = useRouter();
  const [animPhaseIdx, setAnimPhaseIdx] = React.useState(-1);

  // Effect 1 — POST /api/accounts (connection handshake)
  React.useEffect(() => {
    if (skipEffect) return;

    dispatch({ type: "PHASE", phase: "assuming" });
    setAnimPhaseIdx(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < CONNECT_PHASES.length) {
        setAnimPhaseIdx(idx);
        dispatch({ type: "PHASE", phase: CONNECT_PHASES[idx] as Phase });
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
          // Transitions state.phase to "listing" (see reducer SUCCESS case)
          dispatch({
            type: "SUCCESS",
            accountId: data.account.id,
            awsAccountId: data.account.awsAccountId ?? "",
          });
        } else {
          dispatch({
            type: "SCAN_ERROR",
            message: (data as { error?: string }).error ?? "Failed to connect account.",
          });
        }
      })
      .catch(() => {
        dispatch({ type: "SCAN_ERROR", message: "Network error. Check your connection." });
      });

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2 — POST /api/scan (fires when accountId is available)
  React.useEffect(() => {
    if (skipEffect) return;
    if (!state.accountId) return;

    // Kick off scan animation
    setAnimPhaseIdx(CONNECT_PHASES.length); // start at "listing"
    let idx = CONNECT_PHASES.length;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < ALL_PHASES.length) {
        setAnimPhaseIdx(idx);
        dispatch({ type: "PHASE", phase: ALL_PHASES[idx] as Phase });
      } else {
        clearInterval(interval);
      }
    }, 1200); // slower — scan takes longer than connect

    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: state.accountId }),
    })
      .then(async (res) => {
        clearInterval(interval);
        const data = await res.json();
        if (res.ok) {
          dispatch({
            type: "SCAN_SUCCESS",
            totalFindings: (data as { totalFindings: number }).totalFindings ?? 0,
            totalSavingsCents: (data as { totalSavingsCents: number }).totalSavingsCents ?? 0,
          });
        } else {
          // Scan failed — still redirect (scan can be retried from overview)
          dispatch({ type: "SCAN_SUCCESS", totalFindings: 0, totalSavingsCents: 0 });
        }
      })
      .catch(() => {
        clearInterval(interval);
        dispatch({ type: "SCAN_SUCCESS", totalFindings: 0, totalSavingsCents: 0 });
      });

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.accountId]);

  // Effect 3 — redirect on done
  React.useEffect(() => {
    if (skipEffect) return;
    if (state.phase !== "done") return;
    const timeout = setTimeout(() => {
      router.push(`/app/${orgSlug}`);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [state.phase, orgSlug, router, skipEffect]);

  const isError = state.phase === "error";
  const isDone = state.phase === "done";
  const currentPhaseIdx = isDone ? ALL_PHASES.length : animPhaseIdx;

  return (
    <Card>
      <CardBody className="py-10">
        <div className="flex flex-col items-center gap-8">
          {/* Phase list */}
          <ul className="space-y-3 w-full max-w-xs">
            {ALL_PHASES.map((phase, idx) => {
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

          {/* Divider between connect + scan sections */}
          <div className="w-full max-w-xs border-t border-border-subtle" />

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
                {state.scanResult && state.scanResult.totalFindings > 0
                  ? `Found ${state.scanResult.totalFindings} finding${state.scanResult.totalFindings === 1 ? "" : "s"}`
                  : "Connected to AWS account"}
              </p>
              <p className="text-xs text-text-muted">Redirecting to overview…</p>
            </div>
          )}

          {/* In-progress label */}
          {!isError && !isDone && (
            <p className="text-xs text-text-muted">
              {animPhaseIdx >= CONNECT_PHASES.length
                ? "Scanning your account…"
                : "Connecting…"}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 6: Run all wizard tests**

```bash
cd apps/web && pnpm test:run components/integrations/connect-aws/
```
Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/integrations/connect-aws/connect-aws-wizard-state.ts \
        apps/web/components/integrations/connect-aws/step-verifying.tsx \
        apps/web/components/integrations/connect-aws/connect-aws-wizard.test.tsx
git commit -m "d3: wizard scan phases — step-verifying fires POST /api/scan after account creation"
```

---

## Phase D3.E — Overview page update

### Task 9: Show scan results on org root page

**Files:**
- Modify: `apps/web/app/app/[org]/page.tsx`

When `runCount.length > 0`, the page currently falls through to a "Shell mounted" placeholder. D3 replaces that with a real findings summary: total waste, total findings count, and a list of top opportunities. D4 will replace this with the full tabs UI.

- [ ] **Step 1: Read the current page**

The current file is at `apps/web/app/app/[org]/page.tsx`. The bottom of the file (lines 102–121) has:

```tsx
if (runCount.length === 0) {
  return <ScanQueuedView accounts={accountList} orgSlug={params.org} />;
}

// TODO(D4): runs exist — render the real overview tabs (Pulse / Feed / Cost Map / Forecast).
return (
  <div className="p-8">
    <div className="text-text-faint text-mono-sm font-mono mb-2">SHELL · READY</div>
    <h1 className="text-h2 text-text-primary">Shell mounted</h1>
    ...
  </div>
);
```

Replace everything from `if (runCount.length === 0)` to the end of the file with the full implementation below.

- [ ] **Step 2: Implement the ScanCompleteView component and update the page**

Replace the bottom section of `apps/web/app/app/[org]/page.tsx` starting at the `if (runCount.length === 0)` block with:

```tsx
  if (runCount.length === 0) {
    // No runs yet — show "Scan queued" for each account
    return <ScanQueuedView accounts={accountList} orgSlug={params.org} />;
  }

  // Runs exist — load latest opportunities for this org
  const latestOpportunities = await db
    .select({
      id: schema.opportunities.id,
      kind: schema.opportunities.kind,
      resourceId: schema.opportunities.resourceId,
      monthlySavings: schema.opportunities.monthlySavings,
      explanation: schema.opportunities.explanation,
    })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(5);

  const totalSavings = latestOpportunities.reduce(
    (sum, o) => sum + parseFloat(o.monthlySavings ?? "0"),
    0,
  );

  return (
    <ScanCompleteView
      orgSlug={params.org}
      opportunities={latestOpportunities}
      totalSavings={totalSavings}
    />
  );
}
```

Also add this import at the top of the file (after the existing imports) and the `ScanCompleteView` component before `OrgRoot`:

```tsx
import { desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// ScanCompleteView — shown when at least one scan has completed
// ---------------------------------------------------------------------------

type OpportunitySummary = {
  id: string;
  kind: string;
  resourceId: string | null;
  monthlySavings: string | null;
  explanation: string | null;
};

function ScanCompleteView({
  orgSlug,
  opportunities,
  totalSavings,
}: {
  orgSlug: string;
  opportunities: OpportunitySummary[];
  totalSavings: number;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div className="text-mono-sm font-mono text-text-faint">
        STRATOS · OVERVIEW
      </div>
      <h1 className="text-h2 text-text-primary">
        {opportunities.length === 0
          ? "Your account looks healthy"
          : `${fmt(totalSavings / 12)}/mo in waste identified`}
      </h1>
      <p className="text-text-muted">
        {opportunities.length === 0
          ? "The last scan found no waste in your connected accounts. We'll keep watching."
          : `${opportunities.length} finding${opportunities.length === 1 ? "" : "s"} from your latest scan. Full dashboard coming soon.`}
      </p>

      {opportunities.length > 0 && (
        <div className="grid gap-3">
          {opportunities.map((o) => (
            <Card key={o.id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="text-text-primary font-medium font-mono text-sm">
                    {o.resourceId ?? "—"}
                  </div>
                  <div className="text-text-faint text-mono-sm font-mono uppercase">
                    {o.kind}
                  </div>
                </div>
                <Chip kind="waste">
                  {fmt(parseFloat(o.monthlySavings ?? "0"))}/mo
                </Chip>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

The **complete updated file** `apps/web/app/app/[org]/page.tsx` is:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

// ---------------------------------------------------------------------------
// ScanQueuedView — shown when accounts exist but no engine runs yet
// ---------------------------------------------------------------------------

type AccountSummary = {
  id: string;
  name: string;
  awsAccountId: string | null;
  region: string;
  status: string;
};

function ScanQueuedView({
  accounts,
}: {
  accounts: AccountSummary[];
  orgSlug: string;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div className="text-mono-sm font-mono text-text-faint">
        STRATOS · OVERVIEW
      </div>
      <h1 className="text-h2 text-text-primary">Scan queued</h1>
      <p className="text-text-muted">
        Stratos has connected{" "}
        {accounts.length === 1
          ? "your AWS account"
          : `your ${accounts.length} AWS accounts`}
        . The engine will analyze your resources shortly. You&apos;ll see findings
        here when the first scan completes.
      </p>
      <div className="grid gap-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <div className="text-text-primary font-medium">{a.name}</div>
                <div className="text-text-faint text-mono-sm font-mono">
                  AWS {a.awsAccountId ?? "—"} · {a.region}
                </div>
              </div>
              <Chip kind={a.status === "validated" ? "savings" : "neutral"}>
                {a.status === "validated" ? "Connected" : a.status}
              </Chip>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScanCompleteView — shown when at least one scan has completed
// ---------------------------------------------------------------------------

type OpportunitySummary = {
  id: string;
  kind: string;
  resourceId: string | null;
  monthlySavings: string | null;
  explanation: string | null;
};

function ScanCompleteView({
  orgSlug,
  opportunities,
  totalSavings,
}: {
  orgSlug: string;
  opportunities: OpportunitySummary[];
  totalSavings: number;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div className="text-mono-sm font-mono text-text-faint">
        STRATOS · OVERVIEW
      </div>
      <h1 className="text-h2 text-text-primary">
        {opportunities.length === 0
          ? "Your account looks healthy"
          : `${fmt(totalSavings)}/mo in waste identified`}
      </h1>
      <p className="text-text-muted">
        {opportunities.length === 0
          ? "The last scan found no waste in your connected accounts. We&apos;ll keep watching."
          : `${opportunities.length} finding${opportunities.length === 1 ? "" : "s"} from your latest scan. Full dashboard coming in D4.`}
      </p>

      {opportunities.length > 0 && (
        <div className="grid gap-3">
          {opportunities.map((o) => (
            <Card key={o.id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="text-text-primary font-medium font-mono text-sm">
                    {o.resourceId ?? "—"}
                  </div>
                  <div className="text-text-faint text-mono-sm font-mono uppercase">
                    {o.kind}
                  </div>
                </div>
                <Chip kind="waste">
                  {fmt(parseFloat(o.monthlySavings ?? "0"))}/mo
                </Chip>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrgRoot({
  params,
}: {
  params: { org: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}`);

  const accounts = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  // No connected accounts yet — send to the welcome wizard
  if (accounts.length === 0) redirect(`/app/${params.org}/welcome`);

  // Load full account list for this org
  const accountList = await db
    .select({
      id: schema.accounts.id,
      name: schema.accounts.name,
      awsAccountId: schema.accounts.awsAccountId,
      region: schema.accounts.region,
      status: schema.accounts.status,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId));

  // Count runs across all accounts in this org
  const runCount = await db
    .select({ id: schema.runs.id })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  if (runCount.length === 0) {
    return <ScanQueuedView accounts={accountList} orgSlug={params.org} />;
  }

  // Runs exist — load top opportunities by savings
  const latestOpportunities = await db
    .select({
      id: schema.opportunities.id,
      kind: schema.opportunities.kind,
      resourceId: schema.opportunities.resourceId,
      monthlySavings: schema.opportunities.monthlySavings,
      explanation: schema.opportunities.explanation,
    })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(5);

  const totalSavings = latestOpportunities.reduce(
    (sum, o) => sum + parseFloat(o.monthlySavings ?? "0"),
    0,
  );

  return (
    <ScanCompleteView
      orgSlug={params.org}
      opportunities={latestOpportunities}
      totalSavings={totalSavings}
    />
  );
}
```

- [ ] **Step 3: Run typecheck to confirm no type errors**

```bash
cd apps/web && pnpm typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/app/\[org\]/page.tsx
git commit -m "d3: overview page — show findings summary when scan results exist"
```

---

## Phase D3.F — Ship gauntlet

### Task 10: Full gauntlet — typecheck + all tests + build

**Files:**
- None (validation only; fix any regressions inline)

This task runs the same 4-check gauntlet as D1 and D2. All 4 must be green before the D3 ship commit.

- [ ] **Step 1: Typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: 0 errors.

If errors exist: read the error output, fix the file, re-run. Common issues:
- `desc` import missing from a file that uses it
- `ScanResult` type referenced but not exported from wizard-state.ts
- `_req` parameter in route.ts needs underscore or actual usage
- `orgSlug` prop passed to `ScanQueuedView` but not used by the component (it's fine — remove the prop if TSC flags it)

- [ ] **Step 2: Full test suite**

```bash
cd apps/web && pnpm test:run
```
Expected: All tests pass. New tests from D3:
- `lib/aws/pricing.test.ts` — 4 tests
- `lib/aws/assume-role.test.ts` — 3 tests
- `lib/aws/ec2-lister.test.ts` — 4 tests
- `lib/aws/cloudwatch-fetcher.test.ts` — 4 tests
- `lib/scan/run-scan.test.ts` — 5 tests
- `app/api/scan/route.test.ts` — 6 tests
- `app/api/findings/route.test.ts` — 4 tests
- Plus 3 new wizard state tests

If existing tests fail: check whether the wizard state changes broke assumptions. The key change is `SUCCESS` now transitions to `"listing"` instead of `"done"`. Check any test that expects `SUCCESS → done`.

- [ ] **Step 3: Storybook build**

```bash
cd apps/web && pnpm storybook:build
```
Expected: Build completes with no errors. The StepVerifying stories use `skipEffect={true}` via `initialState` prop so no network calls fire.

If stories error: Check that the new `Phase` union type values (`"listing"`, `"fetching"`, `"analyzing"`) don't break any story's `initialState` typing.

- [ ] **Step 4: Production build**

```bash
cd apps/web && pnpm build
```
Expected: Build completes. `api/scan` and `api/findings` routes are dynamic (not statically pre-rendered).

Check the build output for any "attempting to pre-render" warnings on the new routes. If they appear, verify `export const dynamic = "force-dynamic"` is present in both route files.

- [ ] **Step 5: Ship commit**

```bash
git add -A
git commit -m "d3: ship gauntlet passes — engine scan pipeline complete

Wave 1 progress: D1 ✅ D2 ✅ D3 ✅
- AWS helpers: pricing, assume-role, ec2-lister, cloudwatch-fetcher
- runScan() orchestrator: assume → list → fetch → analyze → persist
- POST /api/scan, GET /api/findings
- Wizard scan phases: listing → fetching → analyzing → done
- Overview shows real findings when runs exist
- 30 new tests, all green"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```

---

## D3 ship gate

> **Connected:** A user connects an AWS account in the wizard. The wizard advances through 7 phases (4 connect + 3 scan), then redirects to `/app/[org]`. The overview shows the top findings from the completed scan, with real resource IDs and real monthly savings figures.

> **Persisted:** The `runs` table has a `status: "succeeded"` row. The `opportunities` table has rows for each finding. The `accounts` table has a non-null `lastScanAt`.

> **Endpoint verified:** `GET /api/findings` returns findings for the active org.

---

## D3 → D4 handoff

D4 wires the full overview tabs (Pulse / Feed / Cost Map / Forecast) to the real data endpoints created in D3. The `ScanCompleteView` in `app/app/[org]/page.tsx` is a temporary placeholder — D4 replaces it with the 4-tab layout from `components/dashboard/`.

The plan lives at: `docs/superpowers/plans/2026-05-29-d4-overview-with-real-findings.md`

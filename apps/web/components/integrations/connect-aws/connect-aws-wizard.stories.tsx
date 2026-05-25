/**
 * Storybook stories for ConnectAwsWizard.
 *
 * All stories use the `initialState` prop to render the wizard at a specific
 * step/phase without user interaction.
 *
 * Step 4 stories pass `initialState` which causes the wizard to set
 * `skipEffect={true}` on StepVerifying, preventing the POST /api/accounts
 * fetch and router.push redirect from firing in Storybook.
 *
 * The Step4Assuming story renders the phase list in its idle/pre-animation
 * state (all phases pending) because the animation interval is skipped when
 * `skipEffect=true`. This is a deliberate visual-only deviation to avoid
 * network noise in Storybook.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ConnectAwsWizard } from "./connect-aws-wizard";
import type { WizardState } from "./connect-aws-wizard-state";

// Synthetic test values — not real AWS credentials
const EXTERNAL_ID = "stratos-test1234";
const STRATOS_PRINCIPAL = "arn:aws:iam::000000000000:role/StratosTest";
const ORG_SLUG = "acme";

const BASE_ARGS = {
  externalId: EXTERNAL_ID,
  stratosPrincipal: STRATOS_PRINCIPAL,
  orgSlug: ORG_SLUG,
};

const meta: Meta<typeof ConnectAwsWizard> = {
  title: "ConnectAWS/ConnectAwsWizard",
  component: ConnectAwsWizard,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  args: BASE_ARGS,
};
export default meta;

type Story = StoryObj<typeof ConnectAwsWizard>;

// ── Step 1 ────────────────────────────────────────────────────────────────────

/** Initial state — name input empty, user must type a name and click Next. */
export const Step1Name: Story = {
  args: {
    ...BASE_ARGS,
  },
};

// ── Step 2 ────────────────────────────────────────────────────────────────────

/**
 * Step 2 — role creation instructions (CloudFormation tab shown by default).
 * The user has already entered a name ("Production") and moved to step 2.
 */
export const Step2RoleCFN: Story = {
  args: {
    ...BASE_ARGS,
    initialState: {
      step: 2,
      name: "Production",
      roleArn: "",
      region: "us-east-1",
      phase: "idle",
      accountId: "",
      awsAccountId: "",
      errorMessage: "",
    } satisfies WizardState,
  },
};

/**
 * Step 2 — manual role creation tab.
 *
 * NOTE: The StepRole component renders the CFN tab by default; toggling to
 * the manual tab requires user interaction (clicking the tab). This story
 * therefore renders the same component as Step2RoleCFN. The manual tab
 * instructions are available by clicking "Create manually" within this story.
 * A separate story for the manual tab is omitted because tab state is local
 * to StepRole and cannot be set via initialState.
 */
export const Step2RoleManual: Story = {
  name: "Step2RoleManual (same as Step2RoleCFN — click 'Create manually' tab)",
  args: {
    ...BASE_ARGS,
    initialState: {
      step: 2,
      name: "Production",
      roleArn: "",
      region: "us-east-1",
      phase: "idle",
      accountId: "",
      awsAccountId: "",
      errorMessage: "",
    } satisfies WizardState,
  },
};

// ── Step 3 ────────────────────────────────────────────────────────────────────

/**
 * Step 3 — ARN input. The roleArn field is empty, showing the placeholder.
 * The user must paste a valid ARN to proceed.
 */
export const Step3Arn: Story = {
  args: {
    ...BASE_ARGS,
    initialState: {
      step: 3,
      name: "Production",
      roleArn: "",
      region: "us-east-1",
      phase: "idle",
      accountId: "",
      awsAccountId: "",
      errorMessage: "",
    } satisfies WizardState,
  },
};

// ── Step 4 ────────────────────────────────────────────────────────────────────

/**
 * Step 4 — Verifying, "assuming" phase.
 *
 * Because `initialState` is set, StepVerifying skips the fetch + animation
 * loop (skipEffect=true). The phase list renders in the pre-animation state
 * (all phases pending). This is a static snapshot — the spinner animation
 * does not advance in Storybook.
 */
export const Step4Assuming: Story = {
  args: {
    ...BASE_ARGS,
    initialState: {
      step: 4,
      name: "Production",
      roleArn: "arn:aws:iam::123456789012:role/StratosReadOnly",
      region: "us-east-1",
      phase: "assuming",
      accountId: "",
      awsAccountId: "",
      errorMessage: "",
    } satisfies WizardState,
  },
};

/**
 * Step 4 — Success state.
 *
 * The router.push redirect is suppressed because `initialState` is provided
 * (skipEffect=true on StepVerifying), so this story remains stable.
 */
export const Step4Success: Story = {
  args: {
    ...BASE_ARGS,
    initialState: {
      step: 4,
      name: "Production",
      roleArn: "arn:aws:iam::123456789012:role/StratosReadOnly",
      region: "us-east-1",
      phase: "done",
      accountId: "acc_abc123",
      awsAccountId: "123456789012",
      errorMessage: "",
    } satisfies WizardState,
  },
};

/**
 * Step 4 — Error state.
 *
 * Renders the red error UI with a custom error message and a "Try again"
 * button that returns to step 3.
 */
export const Step4Error: Story = {
  args: {
    ...BASE_ARGS,
    initialState: {
      step: 4,
      name: "Production",
      roleArn: "arn:aws:iam::123456789012:role/StratosReadOnly",
      region: "us-east-1",
      phase: "error",
      accountId: "",
      awsAccountId: "",
      errorMessage: "Stratos cannot assume this role. Check the trust policy ExternalId and try again.",
    } satisfies WizardState,
  },
};

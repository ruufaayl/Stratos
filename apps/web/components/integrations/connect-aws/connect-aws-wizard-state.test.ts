import { describe, it, expect } from "vitest";
import { reducer, initialState, type WizardState } from "./connect-aws-wizard-state";

describe("ConnectAwsWizard reducer", () => {
  it("1. initial state: step=1, all fields empty, phase=idle", () => {
    expect(initialState).toMatchObject({
      step: 1,
      name: "",
      roleArn: "",
      region: "us-east-1",
      phase: "idle",
      accountId: "",
      awsAccountId: "",
    });
  });

  it("2. SET_NAME then NEXT_STEP → step=2, name preserved", () => {
    let state = reducer(initialState, { type: "SET_NAME", value: "acme" });
    state = reducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe(2);
    expect(state.name).toBe("acme");
  });

  it("3. NEXT_STEP from step=1 with empty name → state unchanged", () => {
    const state = reducer(initialState, { type: "NEXT_STEP" });
    expect(state.step).toBe(1);
    expect(state).toEqual(initialState);
  });

  it("4. from step=3 with valid ARN + NEXT_STEP → step=4, phase still idle", () => {
    const step3: WizardState = {
      ...initialState,
      step: 3,
      name: "acme",
      roleArn: "arn:aws:iam::123456789012:role/StratosReadOnly",
    };
    const state = reducer(step3, { type: "NEXT_STEP" });
    expect(state.step).toBe(4);
    expect(state.phase).toBe("idle");
  });

  it("5. from step=3 with invalid ARN + NEXT_STEP → state unchanged", () => {
    const step3: WizardState = {
      ...initialState,
      step: 3,
      name: "acme",
      roleArn: "not-a-valid-arn",
    };
    const state = reducer(step3, { type: "NEXT_STEP" });
    expect(state.step).toBe(3);
  });

  it("6. from step=4 with phase=persisting + SUCCESS → fields populated, phase=listing (scan starts)", () => {
    const step4: WizardState = {
      ...initialState,
      step: 4,
      phase: "persisting",
    };
    const state = reducer(step4, {
      type: "SUCCESS",
      accountId: "acc_123",
      awsAccountId: "123456789012",
    });
    expect(state.phase).toBe("listing");
    expect(state.accountId).toBe("acc_123");
    expect(state.awsAccountId).toBe("123456789012");
  });

  it("7. SCAN_SUCCESS from phase=listing → phase=done with scanResult", () => {
    const scanning: WizardState = {
      ...initialState,
      step: 4,
      phase: "listing",
      accountId: "acc_123",
    };
    const state = reducer(scanning, {
      type: "SCAN_SUCCESS",
      runId: "run-1",
      totalFindings: 3,
      totalSavingsCents: 50000,
    });
    expect(state.phase).toBe("done");
    expect(state.scanResult).toEqual({ runId: "run-1", totalFindings: 3, totalSavingsCents: 50000 });
  });

  it("8. SCAN_ERROR from scan phase → phase=error with message", () => {
    const scanning: WizardState = {
      ...initialState,
      step: 4,
      phase: "analyzing",
      accountId: "acc_123",
    };
    const state = reducer(scanning, {
      type: "SCAN_ERROR",
      message: "engine unreachable",
    });
    expect(state.phase).toBe("error");
    expect(state.errorMessage).toBe("engine unreachable");
  });

  it("9. SCAN_SUCCESS ignored when not in a scan phase", () => {
    const notScanning: WizardState = { ...initialState, step: 4, phase: "persisting" };
    const state = reducer(notScanning, {
      type: "SCAN_SUCCESS",
      runId: "run-1",
      totalFindings: 1,
      totalSavingsCents: 1000,
    });
    expect(state.phase).toBe("persisting");
  });
});

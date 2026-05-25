/** Pure types + reducer + initialState — no React import. */

export type Phase =
  | "idle"
  | "assuming"
  | "identity"
  | "regions"
  | "persisting"
  | "listing"    // scan: discovering EC2 instances
  | "fetching"   // scan: pulling CloudWatch metrics
  | "analyzing"  // scan: engine running
  | "done"
  | "error";

export type ScanResult = {
  runId: string;
  totalFindings: number;
  totalSavingsCents: number;
};

export type WizardState = {
  step: 1 | 2 | 3 | 4;
  name: string;
  roleArn: string;
  region: string;
  phase: Phase;
  /** Populated on account creation SUCCESS */
  accountId: string;
  awsAccountId: string;
  errorMessage: string;
  /** Populated on SCAN_SUCCESS */
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
  | { type: "SCAN_SUCCESS"; runId: string; totalFindings: number; totalSavingsCents: number }
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
      // Guard: step 1 requires non-empty name
      if (state.step === 1 && !state.name.trim()) return state;
      // Guard: step 3 requires valid ARN
      if (state.step === 3 && !ARN_REGEX.test(state.roleArn)) return state;
      // Don't advance past step 4
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
      // PHASE transitions only allowed when step === 4
      if (state.step !== 4) return state;
      return { ...state, phase: action.phase, errorMessage: "" };
    }

    case "SUCCESS": {
      // SUCCESS only allowed when phase === "persisting"
      if (state.phase !== "persisting") return state;
      // Transitions to "listing" (not "done") — scan begins next
      return {
        ...state,
        phase: "listing",
        accountId: action.accountId,
        awsAccountId: action.awsAccountId,
      };
    }

    case "SCAN_SUCCESS": {
      // Only valid during a scan phase
      if (!["listing", "fetching", "analyzing"].includes(state.phase)) return state;
      return {
        ...state,
        phase: "done",
        scanResult: {
          runId: action.runId,
          totalFindings: action.totalFindings,
          totalSavingsCents: action.totalSavingsCents,
        },
      };
    }

    case "SCAN_ERROR": {
      // Only valid during a scan phase
      if (!["listing", "fetching", "analyzing"].includes(state.phase)) return state;
      return { ...state, phase: "error", errorMessage: action.message };
    }

    default:
      return state;
  }
}

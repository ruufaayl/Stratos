/** Pure types + reducer + initialState — no React import. */

export type Phase =
  | "idle"
  | "assuming"
  | "identity"
  | "regions"
  | "persisting"
  | "done"
  | "error";

export type WizardState = {
  step: 1 | 2 | 3 | 4;
  name: string;
  roleArn: string;
  region: string;
  phase: Phase;
  /** Populated on SUCCESS */
  accountId: string;
  awsAccountId: string;
  errorMessage: string;
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
  | { type: "SUCCESS"; accountId: string; awsAccountId: string };

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
      return {
        ...state,
        phase: "done",
        accountId: action.accountId,
        awsAccountId: action.awsAccountId,
      };
    }

    default:
      return state;
  }
}

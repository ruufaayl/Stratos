import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SlugInput } from "./slug-input";

const meta: Meta<typeof SlugInput> = {
  title: "Auth/SlugInput",
  component: SlugInput,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
};
export default meta;

type Story = StoryObj<typeof SlugInput>;

// ── Story components ─────────────────────────────────────────────────────────

function SlugEmpty() {
  const [value, setValue] = React.useState("");
  return (
    <div style={{ width: 320 }}>
      <SlugInput value={value} onChange={setValue} />
    </div>
  );
}

/**
 * Valid — slug passes format validation.
 * Fetch is shimmed to return { ok: true } so the "Available" status renders.
 */
function SlugValid() {
  const [value, setValue] = React.useState("acme-corp");
  // Shim fetch before first render so the debounced check sees it immediately.
  globalThis.fetch = async (_input: RequestInfo | URL) =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  return (
    <div style={{ width: 320 }}>
      <SlugInput value={value} onChange={setValue} />
    </div>
  );
}

/**
 * Taken — slug is valid format but already in use.
 * Fetch is shimmed to return { ok: false, reason: "taken" }.
 */
function SlugTaken() {
  const [value, setValue] = React.useState("stripe");
  globalThis.fetch = async (_input: RequestInfo | URL) =>
    new Response(JSON.stringify({ ok: false, reason: "taken" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  return (
    <div style={{ width: 320 }}>
      <SlugInput value={value} onChange={setValue} />
    </div>
  );
}

// ── Stories ───────────────────────────────────────────────────────────────────

/** Empty — initial state before user types */
export const Empty: Story = {
  render: () => <SlugEmpty />,
};

/** Valid — available slug */
export const Valid: Story = {
  render: () => <SlugValid />,
};

/** Taken — slug already in use */
export const Taken: Story = {
  render: () => <SlugTaken />,
};

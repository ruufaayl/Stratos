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

/** Empty — initial state before user types */
export const Empty: Story = {
  render: () => {
    const [value, setValue] = React.useState("");
    return (
      <div style={{ width: 320 }}>
        <SlugInput value={value} onChange={setValue} />
      </div>
    );
  },
};

/**
 * Valid — user has typed a valid available slug.
 * Fetch is shimmed to return { ok: true } so the "Available" status renders.
 */
export const Valid: Story = {
  render: () => {
    const [value, setValue] = React.useState("acme-corp");
    return (
      <div style={{ width: 320 }}>
        <SlugInput value={value} onChange={setValue} />
      </div>
    );
  },
  decorators: [
    (Story) => {
      // Shim fetch so SlugInput's API call returns "available"
      globalThis.fetch = async (_input: RequestInfo | URL) =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      return <Story />;
    },
  ],
};

/**
 * Taken — slug is valid format but already in use.
 * Fetch is shimmed to return { ok: false, reason: "taken" }.
 */
export const Taken: Story = {
  render: () => {
    const [value, setValue] = React.useState("stripe");
    return (
      <div style={{ width: 320 }}>
        <SlugInput value={value} onChange={setValue} />
      </div>
    );
  },
  decorators: [
    (Story) => {
      // Shim fetch so SlugInput's API call returns "taken"
      globalThis.fetch = async (_input: RequestInfo | URL) =>
        new Response(JSON.stringify({ ok: false, reason: "taken" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      return <Story />;
    },
  ],
};

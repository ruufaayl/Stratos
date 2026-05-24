import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas",   value: "#0A0E1A" },
        { name: "surface",  value: "#0F1626" },
        { name: "elevated", value: "#141B2E" },
      ],
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div
        className="dark"
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          color: "#F1F5F9",
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;

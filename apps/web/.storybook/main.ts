import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../components/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
  ],
  staticDirs: ["../public"],
  typescript: { check: false, reactDocgen: "react-docgen-typescript" },
  viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined),
      "@": path.resolve(__dirname, ".."),
      // Mock Next.js navigation and Clerk so shell stories render without a real Next.js router or Clerk backend
      "next/navigation": path.resolve(__dirname, "mocks/next-navigation.ts"),
      "@clerk/nextjs": path.resolve(__dirname, "mocks/clerk-nextjs.ts"),
    };
    return config;
  },
};

export default config;

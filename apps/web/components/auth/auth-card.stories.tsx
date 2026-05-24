import type { Meta, StoryObj } from "@storybook/react";
import { AuthCard } from "./auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthLink } from "./auth-link";

const meta: Meta<typeof AuthCard> = {
  title: "Auth/AuthCard",
  component: AuthCard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
};
export default meta;

type Story = StoryObj<typeof AuthCard>;

export const Default: Story = {
  args: {
    title: "Sign in to Stratos",
    subtitle: (
      <>
        Don&apos;t have an account? <AuthLink href="/sign-up">Sign up</AuthLink>
      </>
    ),
    children: (
      <>
        <Input type="email" placeholder="you@company.com" />
        <Input type="password" placeholder="Password" />
        <Button className="w-full">Sign in</Button>
      </>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    title: "Create your account",
    subtitle: "Get started in 60 seconds.",
    children: (
      <>
        <Input type="email" placeholder="you@company.com" />
        <Input type="password" placeholder="Password" />
        <Button className="w-full">Create account</Button>
      </>
    ),
    footer: (
      <p className="text-text-faint text-xs">
        By signing up you agree to our{" "}
        <AuthLink href="/legal/terms">Terms</AuthLink>.
      </p>
    ),
  },
};

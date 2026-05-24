import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./toast";
import { Button } from "./button";

function Demo() {
  const t = useToast();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={() => t.push({ kind: "savings", title: "Saved $1,234/mo", body: "8 rightsizing fixes applied." })}>Savings</Button>
      <Button intent="secondary"   onClick={() => t.push({ kind: "intelligence", title: "Engine finished scan", body: "248,458 resources in 111s." })}>Intel</Button>
      <Button intent="destructive" onClick={() => t.push({ kind: "waste", title: "Anomaly: $4,201 spike", body: "us-east-1 RDS." })}>Waste</Button>
      <Button intent="ghost"       onClick={() => t.push({ kind: "risk", title: "Drift detected", body: "3 instances diverged from forecast band." })}>Risk</Button>
    </div>
  );
}

const meta: Meta = {
  title: "Primitives/Toast",
  decorators: [(S) => <ToastProvider><S /></ToastProvider>],
};
export default meta;
type Story = StoryObj;

export const Triggers: Story = { render: () => <Demo /> };

import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "./card";
import { Stat } from "./stat";
import { Sparkline } from "./sparkline";
import { Chip } from "./chip";

const meta: Meta<typeof Card> = { title: "Primitives/Card", component: Card, args: { hover: "lift", style: { width: 360 } } };
export default meta;
type Story = StoryObj<typeof Card>;

const sample = [40, 38, 32, 28, 30, 22, 18, 12, 8, 5];

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Monthly waste · live engine</CardTitle>
        <Chip kind="savings" size="sm">▲ 91%</Chip>
      </CardHeader>
      <CardBody>
        <Stat label="Identified" value="$7,097,364" tone="waste" />
        <div style={{ marginTop: 12 }}>
          <Sparkline data={sample} kind="savings" />
        </div>
      </CardBody>
      <CardFooter>last scan: 14s ago</CardFooter>
    </Card>
  ),
};

export const AnimateIn: Story = { args: { animateIn: true }, render: Default.render };

import type { Meta, StoryObj } from "@storybook/react";
import { Table, THead, TBody, TR, TH, TD } from "./table";
import { Chip } from "./chip";

const meta: Meta<typeof Table> = { title: "Primitives/Table", component: Table };
export default meta;
type Story = StoryObj<typeof Table>;

export const Dense: Story = {
  render: () => (
    <Table>
      <THead>
        <TR>
          <TH>Resource</TH><TH>Type</TH><TH>Region</TH>
          <TH style={{ textAlign: "right" }}>Monthly waste</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {[
          ["i-0abc123", "m5.4xlarge", "us-east-1", "$1,247", "waste"],
          ["i-0def456", "r5.2xlarge", "eu-west-2", "$842",   "risk" ],
          ["i-0ghi789", "t3.medium",  "us-east-1", "$214",   "savings"],
        ].map(([id, type, region, cost, kind]) => (
          <TR key={id as string}>
            <TD>{id}</TD>
            <TD>{type}</TD>
            <TD>{region}</TD>
            <TD numeric>{cost}</TD>
            <TD><Chip kind={kind as any} size="sm">{kind}</Chip></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  ),
};

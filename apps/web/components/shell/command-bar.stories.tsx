import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { CommandBar } from "./command-bar";
import { ShellStorybookHarness } from "./shell-storybook-harness";
import { useCommandBar } from "@/lib/shell/command-bar-context";
import type { CommandResult } from "./command-bar-source";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps CommandBar in the harness and immediately opens the bar.
 * Uses globalThis.fetch stub for async results.
 */
function CommandBarOpen({
  fetchResults = [],
}: {
  fetchResults?: CommandResult[];
}) {
  return (
    <ShellStorybookHarness>
      <CommandBarOpenInner fetchResults={fetchResults} />
    </ShellStorybookHarness>
  );
}

function CommandBarOpenInner({
  fetchResults,
}: {
  fetchResults: CommandResult[];
}) {
  const { openBar } = useCommandBar();
  // Stub fetch so async results return our fixture
  React.useEffect(() => {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ results: fetchResults }),
      } as Response);
    openBar();
    return () => {
      globalThis.fetch = original;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <CommandBar />;
}

function CommandBarClosed() {
  return (
    <ShellStorybookHarness>
      {/* CommandBar is a Modal — when closed only the trigger/shell exists */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          color: "#64748B",
          fontSize: 13,
        }}
      >
        CommandBar is closed (modal). Press ⌘K in the live story to open it.
      </div>
      <CommandBar />
    </ShellStorybookHarness>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: "Shell/CommandBar",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Closed: Story = {
  name: "Closed (trigger only)",
  render: () => <CommandBarClosed />,
};

export const OpenEmptyQuery: Story = {
  name: "Open — empty query",
  render: () => <CommandBarOpen />,
};

const MOCK_FINDINGS: CommandResult[] = [
  { id: "f1", category: "Findings", label: "idle-ec2-prod-us-east", score: 0.9 },
  { id: "f2", category: "Findings", label: "idle-ec2-staging-eu-west", score: 0.8 },
];
const MOCK_RESOURCES: CommandResult[] = [
  { id: "r1", category: "Resources", label: "ec2/i-0abc123 (idle)", score: 0.85 },
  { id: "r2", category: "Resources", label: "ec2/i-0def456 (idle, oversized)", score: 0.7 },
];

export const OpenWithQuery: Story = {
  name: 'Open — with query "idle" (mocked results)',
  render: () => (
    <CommandBarOpenWithQuery
      query="idle"
      fetchResults={[...MOCK_FINDINGS, ...MOCK_RESOURCES]}
    />
  ),
};

function CommandBarOpenWithQuery({
  query,
  fetchResults,
}: {
  query: string;
  fetchResults: CommandResult[];
}) {
  return (
    <ShellStorybookHarness>
      <CommandBarOpenWithQueryInner query={query} fetchResults={fetchResults} />
    </ShellStorybookHarness>
  );
}

function CommandBarOpenWithQueryInner({
  query,
  fetchResults,
}: {
  query: string;
  fetchResults: CommandResult[];
}) {
  const { openBar, setQuery } = useCommandBar();
  React.useEffect(() => {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ results: fetchResults }),
      } as Response);
    openBar();
    setQuery(query);
    return () => {
      globalThis.fetch = original;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <CommandBar />;
}

export const NoResults: Story = {
  name: "No results",
  render: () => <CommandBarNoResults />,
};

function CommandBarNoResults() {
  return (
    <ShellStorybookHarness>
      <CommandBarNoResultsInner />
    </ShellStorybookHarness>
  );
}

function CommandBarNoResultsInner() {
  const { openBar, setQuery } = useCommandBar();
  React.useEffect(() => {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve({
        ok: false,
        json: async () => ({ results: [] }),
      } as unknown as Response);
    openBar();
    // Use a query that has no nav/action/help matches
    setQuery("xyzzy-nothing-matches");
    return () => {
      globalThis.fetch = original;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <CommandBar />;
}

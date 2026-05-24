// apps/web/components/shell/cloud-switcher.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloudSwitcher } from "./cloud-switcher";
import { OrgProvider } from "@/lib/shell/org-context";
import { CloudProvider } from "@/lib/shell/cloud-context";
import type { ReactNode } from "react";

const pushSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
  // Will be overridden per test
  usePathname: vi.fn(() => "/app/acme"),
}));

import { usePathname } from "next/navigation";

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

function Wrapper({
  children,
  available = ["aws"] as const,
  initial = "aws" as const,
}: {
  children: ReactNode;
  available?: readonly ("aws" | "azure" | "gcp")[];
  initial?: "aws" | "azure" | "gcp";
}) {
  return (
    <OrgProvider value={testOrg}>
      <CloudProvider orgId="o1" available={available} initial={initial}>
        {children}
      </CloudProvider>
    </OrgProvider>
  );
}

describe("CloudSwitcher", () => {
  it("returns null when not cloud-scoped path AND only 1 cloud", () => {
    vi.mocked(usePathname).mockReturnValue("/app/acme");
    const { container } = render(
      <Wrapper available={["aws"]}><CloudSwitcher /></Wrapper>
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when cloud-scoped path but only 1 cloud", () => {
    vi.mocked(usePathname).mockReturnValue("/app/acme/aws/services/ec2");
    const { container } = render(
      <Wrapper available={["aws"]}><CloudSwitcher /></Wrapper>
    );
    expect(container.firstChild).toBeNull();
  });

  it("selecting azure from /app/acme/aws/services/ec2 pushes the rewritten URL", async () => {
    pushSpy.mockClear();
    vi.mocked(usePathname).mockReturnValue("/app/acme/aws/services/ec2");
    const user = userEvent.setup();
    render(
      <Wrapper available={["aws", "azure", "gcp"]} initial="aws">
        <CloudSwitcher />
      </Wrapper>
    );
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    const azureItem = within(document.body).getByText("Azure");
    await user.click(azureItem);
    expect(pushSpy).toHaveBeenCalledWith("/app/acme/azure/services/ec2");
  });
});

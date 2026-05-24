// apps/web/components/shell/user-menu.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mutable mock state
let mockStaff = false;
const signOutMock = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "t@x.com" },
      publicMetadata: { staff: mockStaff },
    },
  }),
  useClerk: () => ({ signOut: signOutMock }),
}));

// Import after vi.mock declaration
const { UserMenu } = await import("./user-menu");

describe("UserMenu", () => {
  beforeEach(() => {
    mockStaff = false;
    signOutMock.mockClear();
  });

  it("renders the user trigger button", () => {
    render(<UserMenu />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("staff=false: Admin item is hidden after opening menu", async () => {
    mockStaff = false;
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole("button"));
    expect(within(document.body).queryByText("Admin")).not.toBeInTheDocument();
  });

  it("staff=true: Admin item is visible after opening menu", async () => {
    mockStaff = true;
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole("button"));
    expect(within(document.body).getByText("Admin")).toBeInTheDocument();
  });
});

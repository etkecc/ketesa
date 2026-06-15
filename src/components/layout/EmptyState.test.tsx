import { render, screen } from "@testing-library/react";

import EmptyState from "./EmptyState";

vi.mock("react-admin", () => ({
  CreateButton: ({ resource }: { resource?: string }) => <button type="button">Create {resource}</button>,
  FilterContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  useTranslate: () => (key: string, opts?: Record<string, unknown>) => {
    // "resources.users.name" → "users"
    const resourceNameMatch = key.match(/^resources\.(\w+)\.name$/);
    if (resourceNameMatch) return resourceNameMatch[1];
    if (key === "ra.page.empty") return `No ${opts?.name ?? "items"} yet`;
    if (key === "ra.page.invite") return "Create your first item";
    if (key === "ra.navigation.no_results") return "No results";
    return key;
  },
  useResourceContext: vi.fn(() => "users"),
  useResourceDefinition: vi.fn(() => ({ hasCreate: true })),
}));

import { useResourceContext, useResourceDefinition } from "react-admin";
const mockResourceContext = vi.mocked(useResourceContext);
const mockResourceDefinition = vi.mocked(useResourceDefinition);

describe("EmptyState", () => {
  beforeEach(() => {
    mockResourceContext.mockReturnValue("users");
    mockResourceDefinition.mockReturnValue({ hasCreate: true } as ReturnType<typeof useResourceDefinition>);
  });

  it("renders the empty state message with the resource label", () => {
    render(<EmptyState />);
    expect(screen.getByText(/no users yet/i)).toBeTruthy();
  });

  it("renders Create button when hasCreate is true", () => {
    render(<EmptyState />);
    expect(screen.getByRole("button", { name: /create/i })).toBeTruthy();
  });

  it("renders invite text when hasCreate is true", () => {
    render(<EmptyState />);
    expect(screen.getByText("Create your first item")).toBeTruthy();
  });

  it("hides Create button and shows no-results text when hasCreate is false", () => {
    mockResourceDefinition.mockReturnValue({ hasCreate: false } as ReturnType<typeof useResourceDefinition>);
    render(<EmptyState />);
    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
    expect(screen.getByText("No results")).toBeTruthy();
  });

  it("renders custom actions when provided", () => {
    render(<EmptyState actions={<button type="button">Custom Action</button>} />);
    expect(screen.getByRole("button", { name: "Custom Action" })).toBeTruthy();
  });

  it("uses the resource prop over context when provided", () => {
    mockResourceDefinition.mockReturnValue({ hasCreate: false } as ReturnType<typeof useResourceDefinition>);
    render(<EmptyState resource="rooms" />);
    // resource label is lowercased via translate; the translate mock includes the name
    expect(screen.getByText(/no rooms yet/i)).toBeTruthy();
  });
});

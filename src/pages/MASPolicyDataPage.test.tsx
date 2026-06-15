import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { AdminContext } from "react-admin";

import englishMessages from "../i18n/en";
import MASPolicyDataPage from "./MASPolicyDataPage";

vi.mock("../components/hooks/useDocTitle", () => ({
  useDocTitle: vi.fn(),
}));

const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);

const makeMockDataProvider = (overrides: Record<string, unknown> = {}) => ({
  getList: vi.fn(),
  getOne: vi.fn(),
  getMany: vi.fn(),
  getManyReference: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  getMASPolicyData: vi.fn(),
  setMASPolicyData: vi.fn(),
  ...overrides,
});

const renderPage = (dataProvider: ReturnType<typeof makeMockDataProvider>) =>
  render(
    <AdminContext i18nProvider={i18nProvider} dataProvider={dataProvider}>
      <MASPolicyDataPage />
    </AdminContext>
  );

/** Set a textarea value using fireEvent to avoid userEvent's { } key-sequence parsing. */
const setTextarea = (el: Element, value: string) => {
  fireEvent.change(el, { target: { value } });
};

describe("MASPolicyDataPage", () => {
  it("does not show policy content while still loading", () => {
    // Render without awaiting effects; policy stays undefined → Loading state
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const dp = makeMockDataProvider({ getMASPolicyData: vi.fn(() => new Promise(() => {})) });
    render(
      <AdminContext i18nProvider={i18nProvider} dataProvider={dp}>
        <MASPolicyDataPage />
      </AdminContext>
    );
    // While loading (policy === undefined), the content cards must not be visible
    expect(screen.queryByText("Current Policy")).toBeNull();
    expect(screen.queryByText("Set a New Policy")).toBeNull();
  });

  it("shows no-policy message when getMASPolicyData returns null", async () => {
    const dp = makeMockDataProvider({ getMASPolicyData: vi.fn().mockResolvedValue(null) });

    await act(async () => {
      renderPage(dp);
    });

    await waitFor(() => {
      expect(screen.getByText("No policy is currently set.")).toBeTruthy();
    });
  });

  it("displays existing policy JSON when data is returned", async () => {
    const policyData = { id: "pol-1", data: { allowed: true }, created_at: "2024-01-01T00:00:00Z" };
    const dp = makeMockDataProvider({ getMASPolicyData: vi.fn().mockResolvedValue(policyData) });

    await act(async () => {
      renderPage(dp);
    });

    await waitFor(() => {
      expect(screen.getByText(/"allowed": true/)).toBeTruthy();
    });
  });

  it("shows JSON validation error for invalid JSON input", async () => {
    const dp = makeMockDataProvider({ getMASPolicyData: vi.fn().mockResolvedValue(null) });

    await act(async () => {
      renderPage(dp);
    });
    await waitFor(() => screen.getByRole("textbox"));

    act(() => {
      setTextarea(screen.getByRole("textbox"), "not valid json{");
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid JSON")).toBeTruthy();
    });
  });

  it("Set Policy button is disabled initially and enabled after valid JSON is entered", async () => {
    const dp = makeMockDataProvider({ getMASPolicyData: vi.fn().mockResolvedValue(null) });

    await act(async () => {
      renderPage(dp);
    });
    await waitFor(() => screen.getByRole("textbox"));

    expect(screen.getByRole("button", { name: /set policy/i })).toBeDisabled();

    act(() => {
      setTextarea(screen.getByRole("textbox"), '{"key":"value"}');
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /set policy/i })).not.toBeDisabled();
    });
  });

  it("calls setMASPolicyData with parsed JSON on save", async () => {
    const user = userEvent.setup();
    const setMASPolicyData = vi.fn().mockResolvedValue({ success: true });
    const dp = makeMockDataProvider({
      getMASPolicyData: vi.fn().mockResolvedValue(null),
      setMASPolicyData,
    });

    await act(async () => {
      renderPage(dp);
    });
    await waitFor(() => screen.getByRole("textbox"));

    act(() => {
      setTextarea(screen.getByRole("textbox"), '{"key":"value"}');
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /set policy/i })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: /set policy/i }));

    await waitFor(() => {
      expect(setMASPolicyData).toHaveBeenCalledWith({ key: "value" });
    });
  });

  it("clears the input after a successful save", async () => {
    const user = userEvent.setup();
    const dp = makeMockDataProvider({
      getMASPolicyData: vi.fn().mockResolvedValue(null),
      setMASPolicyData: vi.fn().mockResolvedValue({ success: true }),
    });

    await act(async () => {
      renderPage(dp);
    });
    await waitFor(() => screen.getByRole("textbox"));

    act(() => {
      setTextarea(screen.getByRole("textbox"), '{"key":"value"}');
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /set policy/i })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: /set policy/i }));

    await waitFor(() => {
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// MUI's useMediaQuery walks window.matchMedia; jsdom doesn't ship one.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

const purgeHistoryMock = vi.fn();
const getPurgeHistoryStatusMock = vi.fn();
const notifyMock = vi.fn();

vi.mock("react-admin", () => ({
  Button: ({ label, onClick, children }: any) => (
    <button type="button" onClick={onClick} aria-label={label}>
      {children ?? label}
    </button>
  ),
  useDataProvider: () => ({ purgeHistory: purgeHistoryMock, getPurgeHistoryStatus: getPurgeHistoryStatusMock }),
  useNotify: () => notifyMock,
  useRecordContext: () => ({ id: "!room:hs", name: "Room" }),
  useTranslate: () => (key: string) => key,
}));

import { PurgeHistoryButton } from "./PurgeHistoryButton";

beforeEach(() => {
  vi.clearAllMocks();
  // Purge starts and never resolves: status stays "active" so the close path is exercised mid-run.
  purgeHistoryMock.mockResolvedValue({ success: true, purge_id: "p1" });
  getPurgeHistoryStatusMock.mockResolvedValue({ status: "active" });
});

const startPurge = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "resources.rooms.action.purge_history.label" }));
  const dateInput = screen.getByLabelText("resources.rooms.action.purge_history.date_label");
  fireEvent.change(dateInput, { target: { value: "2024-01-01T00:00" } });
  await user.click(screen.getByRole("button", { name: "ra.action.confirm" }));
  // Wait until the purge is reported active before driving the close.
  await screen.findByText("resources.rooms.action.purge_history.in_progress");
};

describe("PurgeHistoryButton: closing while a purge is running", () => {
  it("notifies that the purge continues server-side instead of dropping it silently", async () => {
    const user = userEvent.setup();
    render(<PurgeHistoryButton />);

    await startPurge(user);

    // Cancel is disabled mid-run; the dialog still closes on Escape.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });

    expect(notifyMock).toHaveBeenCalledWith("resources.rooms.action.purge_history.background_note", { type: "info" });
  });

  it("does not emit the background note when closing with no purge running", async () => {
    const user = userEvent.setup();
    render(<PurgeHistoryButton />);

    await user.click(screen.getByRole("button", { name: "resources.rooms.action.purge_history.label" }));
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape", code: "Escape" });

    expect(notifyMock).not.toHaveBeenCalledWith(
      "resources.rooms.action.purge_history.background_note",
      expect.anything()
    );
  });
});

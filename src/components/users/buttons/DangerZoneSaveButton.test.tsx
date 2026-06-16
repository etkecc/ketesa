/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// MUI's useMediaQuery (inside TypeToConfirmDialog) walks window.matchMedia. jsdom lacks it; polyfill.
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

const MXID = "@alice:hs.example.com";

// Mutable per-test state read by the mocked hooks.
let recordData: any = {};
let formValues: any = {};
const saveMock = vi.fn();
const setErrorMock = vi.fn();

vi.mock("react-admin", () => ({
  SaveButton: ({ onClick }: any) => (
    <button type="button" onClick={onClick}>
      save
    </button>
  ),
  // Light escalate dialog stand-in: distinct from the real TypeToConfirmDialog (which renders a textbox).
  Confirm: ({ isOpen, onConfirm, onClose, content }: any) =>
    isOpen ? (
      <div role="dialog" aria-label="escalate">
        <div>{content}</div>
        <button onClick={onConfirm}>escalate-confirm</button>
        <button onClick={onClose}>escalate-cancel</button>
      </div>
    ) : null,
  useRecordContext: () => recordData,
  useSaveContext: () => ({ save: saveMock }),
  useTranslate: () => (key: string) => key,
  setSubmissionErrors: vi.fn(),
}));

vi.mock("react-hook-form", () => ({
  useFormContext: () => ({
    handleSubmit: (onValid: any) => () => onValid(formValues),
    setError: setErrorMock,
  }),
}));

import DangerZoneSaveButton from "./DangerZoneSaveButton";

const clickSave = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "save" }));

beforeEach(() => {
  vi.clearAllMocks();
  recordData = { id: MXID, erased: false, deactivated: false, admin: false };
  formValues = { id: MXID, erased: false, deactivated: false, admin: false };
});

describe("DangerZoneSaveButton", () => {
  it("no escalation (only a profile field changed): saves once, no dialog", async () => {
    const user = userEvent.setup();
    formValues = { ...formValues, displayname: "New Name" };
    render(<DangerZoneSaveButton />);

    await clickSave(user);

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock).toHaveBeenCalledWith(formValues);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("de-escalation (admin on -> off): saves once, no dialog", async () => {
    const user = userEvent.setup();
    recordData = { ...recordData, admin: true };
    formValues = { ...formValues, admin: false };
    render(<DangerZoneSaveButton />);

    await clickSave(user);

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deactivate escalation (off -> on): light confirm, save only after confirming", async () => {
    const user = userEvent.setup();
    formValues = { ...formValues, deactivated: true };
    render(<DangerZoneSaveButton />);

    await clickSave(user);

    const dialog = await screen.findByRole("dialog", { name: "escalate" });
    expect(saveMock).not.toHaveBeenCalled();
    // light confirm has no type-to-confirm textbox
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(within_(dialog, "escalate-confirm"));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
  });

  it("admin grant escalation (off -> on): light confirm, save only after confirming", async () => {
    const user = userEvent.setup();
    formValues = { ...formValues, admin: true };
    render(<DangerZoneSaveButton />);

    await clickSave(user);

    await screen.findByRole("dialog", { name: "escalate" });
    expect(saveMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "escalate-confirm" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
  });

  it("erase escalation: strong type-the-MXID gate, save only after exact MXID + confirm", async () => {
    const user = userEvent.setup();
    formValues = { ...formValues, deactivated: true, erased: true };
    render(<DangerZoneSaveButton />);

    await clickSave(user);

    // strong dialog: a textbox is present, and save has not fired
    const textbox = await screen.findByRole("textbox");
    expect(saveMock).not.toHaveBeenCalled();

    const confirm = screen.getByRole("button", { name: "ra.action.confirm" });
    expect(confirm).toBeDisabled();

    await user.type(textbox, MXID);
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
  });

  it("idempotency: confirming the erase fires save EXACTLY once, not twice", async () => {
    const user = userEvent.setup();
    formValues = { ...formValues, deactivated: true, erased: true };
    render(<DangerZoneSaveButton />);

    await clickSave(user);
    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, MXID);

    const confirm = screen.getByRole("button", { name: "ra.action.confirm" });
    await user.click(confirm);
    // UI-level idempotency: the dialog closes on confirm so the button unmounts; a second click
    // can't re-enter. (The in-flight `saving` ref additionally guards any programmatic double-call.)
    await user.click(confirm).catch(() => undefined);

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("erase with a wrong MXID never enables confirm, never saves", async () => {
    const user = userEvent.setup();
    formValues = { ...formValues, deactivated: true, erased: true };
    render(<DangerZoneSaveButton />);

    await clickSave(user);
    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "@someone:else");

    expect(screen.getByRole("button", { name: "ra.action.confirm" })).toBeDisabled();
    expect(saveMock).not.toHaveBeenCalled();
  });
});

// Small helper: scope a query to a dialog element to avoid cross-dialog ambiguity.
function within_(el: HTMLElement, name: string): HTMLElement {
  const btn = Array.from(el.querySelectorAll("button")).find(b => b.textContent === name);
  if (!btn) throw new Error(`button "${name}" not found in dialog`);
  return btn as HTMLElement;
}

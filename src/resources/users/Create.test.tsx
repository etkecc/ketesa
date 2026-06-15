/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Form payload the mocked SimpleForm submits; set per test before clicking submit.
let submitData: Record<string, any> = {};

const createMock = vi.fn();
const masSetAdminMock = vi.fn();
const masSetPasswordMock = vi.fn();
const notifyMock = vi.fn();
const redirectMock = vi.fn();

// Captures every TextInput's props so a test can assert the username field is validated.
const textInputProps: Record<string, any>[] = [];

vi.mock("react-admin", () => ({
  Create: ({ children }: any) => <div>{children}</div>,
  // Render children plus a submit trigger that drives handleSubmit with the per-test payload.
  SimpleForm: ({ onSubmit, children }: any) => (
    <div>
      {children}
      <button type="button" aria-label="submit" onClick={() => onSubmit(submitData)}>
        submit
      </button>
    </div>
  ),
  TextInput: (props: any) => {
    textInputProps.push(props);
    return null;
  },
  BooleanInput: () => null,
  useCreate: () => [createMock],
  useDataProvider: () => ({ masSetAdmin: masSetAdminMock, masSetPassword: masSetPasswordMock }),
  useNotify: () => notifyMock,
  useRedirect: () => redirectMock,
  useTranslate: () => (key: string) => key,
}));

vi.mock("../../providers/data/mas", () => ({
  isMAS: () => true,
}));

vi.mock("../../components/hooks/useDocTitle", () => ({
  useDocTitle: () => undefined,
}));

// Edit.tsx is large and pulls heavy deps; only its create-form helpers are referenced here.
vi.mock("./Edit", () => ({
  choices_medium: [],
  choices_type: [],
  validateUser: () => undefined,
  validateAddress: () => undefined,
  UserPasswordInput: () => null,
}));

import { UserCreate } from "./Create";
// Mocked above: gives the same validateUser reference the component wires onto the field.
import { validateUser } from "./Edit";

const MAS_ID = "01HABCDEFULID";

const submit = async (data: Record<string, any>) => {
  submitData = data;
  const user = userEvent.setup();
  render(<UserCreate resource="users" />);
  await user.click(screen.getByRole("button", { name: "submit" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  submitData = {};
  textInputProps.length = 0;
  createMock.mockResolvedValue({ id: "@alice:hs", mas_id: MAS_ID });
  masSetAdminMock.mockResolvedValue({ success: true });
  masSetPasswordMock.mockResolvedValue({ success: true });
});

describe("MASUserCreate: post-creation failure surfacing", () => {
  it("set-password failure surfaces the server error and suppresses the success notification", async () => {
    masSetPasswordMock.mockResolvedValue({ success: false, error: "Password is too weak" });

    await submit({ username: "alice", password: "weak" });

    expect(notifyMock).toHaveBeenCalledWith("Password is too weak", { type: "error" });
    expect(notifyMock).not.toHaveBeenCalledWith("ra.notification.created", expect.anything());
    // The user exists; admin still lands on the user page to recover.
    expect(redirectMock).toHaveBeenCalled();
  });

  it("set-admin failure surfaces the server error and suppresses the success notification", async () => {
    masSetAdminMock.mockResolvedValue({ success: false, error: "boom" });

    await submit({ username: "alice", admin: true });

    expect(notifyMock).toHaveBeenCalledWith("boom", { type: "error" });
    expect(notifyMock).not.toHaveBeenCalledWith("ra.notification.created", expect.anything());
  });

  it("falls back to a translation key when the failed step returns no error message", async () => {
    masSetPasswordMock.mockResolvedValue({ success: false });

    await submit({ username: "alice", password: "weak" });

    expect(notifyMock).toHaveBeenCalledWith("resources.users.action.set_password_failure", { type: "error" });
  });

  it("a thrown (non-HttpError) failure is caught and still suppresses success", async () => {
    masSetPasswordMock.mockRejectedValue(new TypeError("network down"));

    await submit({ username: "alice", password: "weak" });

    expect(notifyMock).toHaveBeenCalledWith("resources.users.action.set_password_failure", { type: "error" });
    expect(notifyMock).not.toHaveBeenCalledWith("ra.notification.created", expect.anything());
  });

  it("all steps succeed: shows the created notification and no error", async () => {
    await submit({ username: "alice", password: "Str0ng-Passw0rd!", admin: true });

    expect(masSetAdminMock).toHaveBeenCalledWith(MAS_ID, true);
    expect(masSetPasswordMock).toHaveBeenCalledWith(MAS_ID, "Str0ng-Passw0rd!");
    expect(notifyMock).toHaveBeenCalledWith("ra.notification.created", { messageArgs: { smart_count: 1 } });
    expect(notifyMock).not.toHaveBeenCalledWith(expect.anything(), { type: "error" });
  });

  it("both admin and password fail: both messages are surfaced together", async () => {
    masSetAdminMock.mockResolvedValue({ success: false, error: "admin boom" });
    masSetPasswordMock.mockResolvedValue({ success: false, error: "Password is too weak" });

    await submit({ username: "alice", password: "weak", admin: true });

    expect(notifyMock).toHaveBeenCalledWith("admin boom; Password is too weak", { type: "error" });
    expect(notifyMock).not.toHaveBeenCalledWith("ra.notification.created", expect.anything());
  });
});

describe("MASUserCreate username validation", () => {
  it("wires validateUser onto the username field (the MAS path previously had none)", () => {
    render(<UserCreate resource="users" />);

    const usernameField = textInputProps.find(p => p.source === "username");
    expect(usernameField).toBeDefined();
    // Wiring check only: confirms the field carries the shared validator. The regex
    // behaviour (rejecting @user:host) lives where validateUser is defined, in Edit.tsx.
    expect(usernameField?.validate).toBe(validateUser);
  });
});

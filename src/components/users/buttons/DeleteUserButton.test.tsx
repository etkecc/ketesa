/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// MUI's useMediaQuery walks window.matchMedia. jsdom doesn't ship one; polyfill before render.
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

const masDeactivateUserMock = vi.fn();
const redactUserEventsMock = vi.fn();
const getRedactStatusMock = vi.fn();
const notifyMock = vi.fn();
const redirectMock = vi.fn();
const unselectAllMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("react-admin", () => ({
  Button: ({ label, onClick, disabled, children }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}>
      {children ?? label}
    </button>
  ),
  SimpleForm: ({ children }: any) => <div>{children}</div>,
  BooleanInput: ({ label, onChange }: any) => (
    <label>
      <input type="checkbox" onChange={onChange} />
      {label}
    </label>
  ),
  useTranslate: () => (key: string) => key,
  useNotify: () => notifyMock,
  useRedirect: () => redirectMock,
  useDeleteMany: () => [deleteManyMock, { isLoading: false }],
  useDataProvider: () => ({
    masDeactivateUser: masDeactivateUserMock,
    redactUserEvents: redactUserEventsMock,
    getRedactStatus: getRedactStatusMock,
  }),
  useUnselectAll: () => unselectAllMock,
}));

vi.mock("../../../providers/data/mas", () => ({
  isMAS: () => true,
}));

const jsonClientMock = vi.fn();
vi.mock("../../../providers/http", () => ({
  jsonClient: (...args: any[]) => jsonClientMock(...args),
}));

import DeleteUserButton from "./DeleteUserButton";

const SYNAPSE_BASE = "https://synapse.example.com";

const openConfirmDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "ra.action.delete" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: /ra\.action\.confirm/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("base_url", SYNAPSE_BASE);
  masDeactivateUserMock.mockResolvedValue({});
  jsonClientMock.mockResolvedValue({ json: {} });
});

describe("DeleteUserButton (MAS mode): split MAS / Synapse-only dispatch", () => {
  it("mixed selection: exactly one MAS deactivate + exactly one Synapse v2 PUT", async () => {
    const user = userEvent.setup();
    render(
      <DeleteUserButton
        selectedIds={["@alice:hs", "@bot:hs"]}
        confirmTitle="t"
        confirmContent="c"
        masIdMap={{ "@alice:hs": "01HABCDEFULID", "@bot:hs": undefined }}
      />
    );

    await openConfirmDialog(user);

    expect(masDeactivateUserMock).toHaveBeenCalledTimes(1);
    expect(masDeactivateUserMock).toHaveBeenCalledWith("01HABCDEFULID", false);

    const synapsePuts = jsonClientMock.mock.calls.filter(
      ([, opts]) => opts?.method === "PUT" && JSON.parse(opts?.body || "{}").deactivated === true
    );
    expect(synapsePuts).toHaveLength(1);
    expect(synapsePuts[0][0]).toBe(`${SYNAPSE_BASE}/_synapse/admin/v2/users/${encodeURIComponent("@bot:hs")}`);
  });

  it("only Synapse-only users: zero masDeactivate calls, one PUT per user", async () => {
    const user = userEvent.setup();
    render(
      <DeleteUserButton
        selectedIds={["@bot1:hs", "@bot2:hs"]}
        confirmTitle="t"
        confirmContent="c"
        masIdMap={{ "@bot1:hs": undefined, "@bot2:hs": undefined }}
      />
    );

    await openConfirmDialog(user);

    expect(masDeactivateUserMock).not.toHaveBeenCalled();
    const synapsePuts = jsonClientMock.mock.calls.filter(([, opts]) => opts?.method === "PUT");
    expect(synapsePuts).toHaveLength(2);
  });

  it("only MAS users: zero Synapse v2 PUTs (regression guard)", async () => {
    const user = userEvent.setup();
    render(
      <DeleteUserButton
        selectedIds={["@alice:hs", "@carol:hs"]}
        confirmTitle="t"
        confirmContent="c"
        masIdMap={{ "@alice:hs": "01ULIDALICE", "@carol:hs": "01ULIDCAROL" }}
      />
    );

    await openConfirmDialog(user);

    expect(masDeactivateUserMock).toHaveBeenCalledTimes(2);
    const synapsePuts = jsonClientMock.mock.calls.filter(([, opts]) => opts?.method === "PUT");
    expect(synapsePuts).toHaveLength(0);
  });

  it("idempotency: re-rendering with the same selection produces one call per record per run", async () => {
    const user = userEvent.setup();
    const props = {
      selectedIds: ["@alice:hs", "@bot:hs"],
      confirmTitle: "t",
      confirmContent: "c",
      masIdMap: { "@alice:hs": "01ULIDALICE", "@bot:hs": undefined } as Record<string, string | undefined>,
    };

    const first = render(<DeleteUserButton {...props} />);
    await openConfirmDialog(user);

    expect(masDeactivateUserMock).toHaveBeenCalledTimes(1);
    expect(jsonClientMock.mock.calls.filter(([, opts]) => opts?.method === "PUT")).toHaveLength(1);

    first.unmount();

    render(<DeleteUserButton {...props} />);
    await openConfirmDialog(user);

    // Second run produces exactly the same shape; no accumulation, no fan-out doubling per record.
    expect(masDeactivateUserMock).toHaveBeenCalledTimes(2);
    expect(jsonClientMock.mock.calls.filter(([, opts]) => opts?.method === "PUT")).toHaveLength(2);
  });
});

describe("DeleteUserButton: single-selection type-the-MXID gate", () => {
  it("single selection: Confirm stays disabled until the exact MXID is typed", async () => {
    const user = userEvent.setup();
    render(
      <DeleteUserButton
        selectedIds={["@alice:hs"]}
        confirmTitle="t"
        confirmContent="c"
        masIdMap={{ "@alice:hs": "01ULIDALICE" }}
      />
    );

    await user.click(screen.getByRole("button", { name: "ra.action.delete" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /ra\.action\.confirm/ });

    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByRole("textbox"), "@alice:wrong");
    expect(confirm).toBeDisabled();
    expect(masDeactivateUserMock).not.toHaveBeenCalled();

    await user.clear(within(dialog).getByRole("textbox"));
    await user.type(within(dialog).getByRole("textbox"), "@alice:hs");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(masDeactivateUserMock).toHaveBeenCalledTimes(1);
  });

  it("bulk selection (length > 1): no type-to-confirm field, Confirm fires directly", async () => {
    const user = userEvent.setup();
    render(
      <DeleteUserButton
        selectedIds={["@alice:hs", "@bob:hs"]}
        confirmTitle="t"
        confirmContent="c"
        masIdMap={{ "@alice:hs": "01ULIDALICE", "@bob:hs": "01ULIDBOB" }}
      />
    );

    await user.click(screen.getByRole("button", { name: "ra.action.delete" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /ra\.action\.confirm/ }));
    expect(masDeactivateUserMock).toHaveBeenCalledTimes(2);
  });
});

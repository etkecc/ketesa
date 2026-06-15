/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The room admin/join buttons live in List.tsx alongside the full RoomList, so importing
// the module pulls in every react-admin export and sibling button it references. We only
// exercise MakeAdminBtn + JoinUserBtn, so the rest is stubbed just enough to load.

const makeRoomAdminMock = vi.fn();
const joinUserToRoomMock = vi.fn();
const notifyMock = vi.fn();

// mutate() runs the mutationFn directly so a "valid input" test reaches the data provider.
vi.mock("@tanstack/react-query", () => ({
  useMutation: ({ mutationFn }: any) => ({
    mutate: () => mutationFn(),
    isPending: false,
  }),
}));

vi.mock("react-admin", () => ({
  // Real-ish primitives the two buttons use.
  Button: ({ label, onClick, disabled, children }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}>
      {children ?? label}
    </button>
  ),
  Confirm: ({ isOpen, onConfirm, content }: any) =>
    isOpen ? (
      <div role="dialog">
        {content}
        <button type="button" aria-label="confirm" onClick={onConfirm}>
          confirm
        </button>
      </div>
    ) : null,
  useRecordContext: () => ({ room_id: "!room:hs", name: "Room", joined_local_members: 3 }),
  useDataProvider: () => ({ makeRoomAdmin: makeRoomAdminMock, joinUserToRoom: joinUserToRoomMock }),
  useNotify: () => notifyMock,
  useTranslate: () => (key: string) => key,
  // Unused-by-these-tests exports, stubbed so the module imports.
  useListContext: () => ({ selectedIds: [] }),
  useGetMany: () => ({ data: [], isLoading: false }),
  BooleanField: () => null,
  WrapperField: () => null,
  ExportButton: () => null,
  FilterButton: () => null,
  FunctionField: () => null,
  NullableBooleanInput: () => null,
  Pagination: () => null,
  ReferenceField: () => null,
  SearchInput: () => null,
  SelectColumnsButton: () => null,
  TextField: () => null,
  TopToolbar: ({ children }: any) => <div>{children}</div>,
  Link: ({ children }: any) => <span>{children}</span>,
}));

// Sibling buttons + layout pulled in by the RoomList; stub so the import graph resolves.
vi.mock("../room-directory", () => ({
  RoomDirectoryBulkUnpublishButton: () => null,
  RoomDirectoryBulkPublishButton: () => null,
}));
vi.mock("../../components/users/fields/AvatarField", () => ({ default: () => null }));
vi.mock("../../components/users/buttons/BlockRoomButton", () => ({
  BlockRoomBulkButton: () => null,
  UnblockRoomBulkButton: () => null,
  BlockRoomByIdButton: () => null,
}));
vi.mock("../../components/users/buttons/DeleteRoomButton", () => ({ default: () => null }));
vi.mock("../../components/users/buttons/DeleteAllMediaButton", () => ({ DeleteRoomMediaBulkButton: () => null }));
vi.mock("../../components/hooks/useDocTitle", () => ({ useDocTitle: () => undefined }));
vi.mock("../../components/layout", () => ({
  Datagrid: ({ children }: any) => <div>{children}</div>,
  EmptyState: () => null,
  List: ({ children }: any) => <div>{children}</div>,
}));

import { MakeAdminBtn, JoinUserBtn } from "./List";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  makeRoomAdminMock.mockResolvedValue({ success: true });
  joinUserToRoomMock.mockResolvedValue({ success: true });
});

const openAndConfirm = async (user: ReturnType<typeof userEvent.setup>, openLabel: string, mxid: string) => {
  await user.click(screen.getByRole("button", { name: openLabel }));
  const dialog = await screen.findByRole("dialog");
  const input = within(dialog).getByLabelText("resources.users.fields.id");
  await user.clear(input);
  if (mxid) {
    await user.type(input, mxid);
  }
  await user.click(within(dialog).getByRole("button", { name: "confirm" }));
};

describe("MakeAdminBtn: MXID validation guard", () => {
  it("rejects a non-MXID without calling makeRoomAdmin", async () => {
    const user = userEvent.setup();
    render(<MakeAdminBtn />);

    await openAndConfirm(user, "resources.rooms.action.make_admin.assign_admin", "alice");

    expect(makeRoomAdminMock).not.toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledWith("ketesa.auth.username_error", { type: "warning" });
  });

  it("accepts a full MXID and calls makeRoomAdmin with it", async () => {
    const user = userEvent.setup();
    render(<MakeAdminBtn />);

    await openAndConfirm(user, "resources.rooms.action.make_admin.assign_admin", "@alice:hs");

    expect(makeRoomAdminMock).toHaveBeenCalledWith("!room:hs", "@alice:hs");
    expect(notifyMock).not.toHaveBeenCalledWith("ketesa.auth.username_error", expect.anything());
  });
});

describe("JoinUserBtn: MXID validation guard", () => {
  it("rejects a non-MXID without calling joinUserToRoom", async () => {
    const user = userEvent.setup();
    render(<JoinUserBtn />);

    await openAndConfirm(user, "resources.rooms.action.join.label", "not-an-mxid");

    expect(joinUserToRoomMock).not.toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledWith("ketesa.auth.username_error", { type: "warning" });
  });

  it("accepts a full (federated) MXID and calls joinUserToRoom with it", async () => {
    const user = userEvent.setup();
    render(<JoinUserBtn />);

    await openAndConfirm(user, "resources.rooms.action.join.label", "@bob:other.example.com");

    expect(joinUserToRoomMock).toHaveBeenCalledWith("!room:hs", "@bob:other.example.com");
    expect(notifyMock).not.toHaveBeenCalledWith("ketesa.auth.username_error", expect.anything());
  });
});

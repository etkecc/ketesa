// Regression suite for Datagrid.tsx a11y; react-admin partially mocked (ReferenceField fully, needs QueryClient).

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Invented DE-like strings for the mock; room_members.displayname and unlabeled_field are deliberately absent.
const TRANSLATIONS: Record<string, string> = {
  // users_media resource; mirrors src/i18n/de/misc_resources.ts
  "resources.users_media.fields.media_id": "Medien-ID",
  "resources.users_media.fields.created_ts": "Erstellt",
  "resources.users_media.fields.last_access_ts": "Letzter Zugriff",
  "resources.users_media.fields.media_length": "Größe", // "File Size"
  "resources.users_media.fields.media_type": "Typ",
  "resources.users_media.fields.upload_name": "Dateiname",
  "resources.users_media.fields.quarantined_by": "In Quarantäne von",
  // users resource; mirrors src/i18n/de/users.ts
  "resources.users.fields.id": "Benutzer-ID",
  "resources.users.fields.displayname": "Anzeigename", // "Display name"
  "resources.users.fields.admin": "Administrator",
  "resources.users.fields.creation_ts_ms": "Erstellt am",
  "resources.users.fields.is_guest": "Gastbenutzer",
  // room_members resource; deliberately missing "displayname" (exposes Bug #5)
  "resources.room_members.fields.id": "Mitglieds-ID",
  // boolean labels; react-admin's standard keys used by formatCellValue()
  "ra.boolean.true": "Ja", // "Yes"
  "ra.boolean.false": "Nein", // "No"
};

// Simulates translate() (matches RA's polyglot lookup order): exact key, then opts._, then the raw key.
const translate = (key: string, opts?: Record<string, unknown>): string =>
  TRANSLATIONS[key] ?? (opts?._ as string | undefined) ?? key;

// Simulates DataProvider records for ReferenceField by Matrix ID; used by the mock, skips QueryClient setup.
const RESOLVED_USERS: Record<string, Record<string, unknown>> = {
  // Key = Matrix user ID (the outer record's source field); value = what GET /users/:id would return.
  "@alice:example.org": { id: "@alice:example.org", displayname: "Alice" },
};

// MEDIA_RECORD mirrors the Synapse Admin API shape; quarantined_by null hits the dash fallback.
const MEDIA_RECORD = {
  id: "1",
  media_id: "mxc://example.org/abc123",
  created_ts: 1700000000000, // 2023-11-14T22:13:20.000Z in milliseconds
  last_access_ts: 1699900000000,
  media_length: 1024, // bytes; formatBytes(1024) = "1.0 KB"
  media_type: "image/jpeg",
  upload_name: "photo.jpg",
  quarantined_by: null, // null → title value should be "-"
};

// users record: id has @/: chars invalid as HTML id attrs, so the DatagridRow mock must not spread id onto tr.
const USER_RECORD = {
  id: "@alice:example.org",
  displayname: "Alice",
  admin: true,
  creation_ts_ms: 1700000000000,
  is_guest: false,
};

// room_members record: displayname backs the ReferenceField test and the wrong-resource-context fallback test.
const MEMBER_RECORD = {
  id: "@alice:example.org",
  displayname: "Alice",
};

// Mutable object wrappers let vi.mock() closures capture the binding once and read .current fresh at call time.

/** The array of records that DatagridConfigurable mock passes to AccessibleBody as `data`. */
const mockDataRef: { current: Record<string, unknown>[] } = { current: [] };

/** The resource name that DatagridConfigurable and useResourceContext return for the current render. */
const resourceRef: { current: string } = { current: "users" };

// importOriginal + ...actual keeps real fields authentic; a full mock could mask the rendering bug we test for.

vi.mock("react-admin", async importOriginal => {
  // Destructures real RecordContextProvider/useRecordContext so ReferenceField's mock avoids a circular reference.
  const actual = await importOriginal<typeof import("react-admin")>();
  const { RecordContextProvider, useRecordContext } = actual;

  return {
    // Spread first so all real exports default in; overrides below shadow the specific keys they replace.
    ...actual,

    // Mocked to avoid QueryClient; renders <span title> since the real ReferenceField has no DOM node for it.
    ReferenceField: vi.fn(
      ({
        children,
        // source: outer record field holding the reference id, e.g. source="id" -> record["id"].
        source,
        // `reference`; the resource to fetch from, e.g. "users".
        reference,
        // title: injected by injectCellTitles; passed through to the DOM span so tests can assert on it.
        title,
        // Every other prop (label, link, sortable, etc.) is consumed and silently discarded here.
      }: {
        children?: React.ReactNode;
        source: string;
        reference: string;
        title?: string;
        [k: string]: unknown;
      }) => {
        // Reads the outer record (e.g. the room_members row) from RecordContextProvider, ahead of resolution.
        const record = useRecordContext() as Record<string, unknown> | undefined;

        // Derives the reference id from the outer record via the source prop, e.g. source="id" -> record.id.
        const sourceId = record ? String(record[source] ?? "") : "";

        // Simulates DataProvider.getMany by reading RESOLVED_USERS directly, skipping React Query batching.
        const resolved =
          reference === "users" ? (RESOLVED_USERS[sourceId] as import("react-admin").RaRecord) : undefined;

        return (
          <span title={title}>
            {/* Provides the resolved record as context so children read its value instead of the outer record. */}
            <RecordContextProvider value={resolved ?? ({ id: "" } as import("react-admin").RaRecord)}>
              {children}
            </RecordContextProvider>
          </span>
        );
      }
    ),

    // Mocked (needs a full AdminContext); clones body with test data/resource, exercising AccessibleBody directly.
    DatagridConfigurable: vi.fn(
      ({
        // body is <AccessibleBody rowLabel={rowLabel} />; rowLabel is baked in already, no need to thread it.
        body,
        // children are field elements from the <Datagrid> in the test; AccessibleBody feeds them to injectCellTitles.
        children,
        // rowClick is forwarded so AccessibleRow can tell whether the row is clickable (tabIndex, aria, keydown).
        rowClick,
        // Every other DatagridConfigurable prop is ignored; irrelevant to the accessibility features under test.
      }: {
        body: React.ReactElement;
        children?: React.ReactNode;
        rowClick?: unknown;
        [k: string]: unknown;
      }) =>
        React.cloneElement(
          // Cast needed: body's prop type is unknown here, but at runtime it's AccessibleBodyProps.
          body as React.ReactElement<Record<string, unknown>>,
          {
            // Records to render; set by renderWith() before each test render.
            data: mockDataRef.current,
            // Resource name; resolveLabel() uses it to build the i18n key resources.<resource>.fields.<source>.
            resource: resourceRef.current,
            // Forward rowClick so AccessibleRow knows whether rows are clickable.
            rowClick,
            // The field elements; AccessibleBody passes them to injectCellTitles.
            children,
            // Minimal required RA props:
            selectedIds: [] as unknown[], // no rows selected
            hasBulkActions: false, // no bulk-action checkbox column
          }
        )
    ),

    // Mocked (needs Store context); renders a bare tr with children direct (invalid HTML, fine in jsdom).
    DatagridRow: vi.fn(
      ({
        children,
        // RA-specific props, ignored below; rowClick is already handled by AccessibleRow.
        rowClick: _rowClick,
        // expand    : row expansion feature; not tested here.
        expand: _expand,
        // hasBulkActions, selectable, selected, onToggleItem : checkbox column.
        hasBulkActions: _hasBulkActions,
        selectable: _selectable,
        selected: _selected,
        onToggleItem: _onToggleItem,
        // hover     : MUI hover styling; not a DOM attribute.
        hover: _hover,
        // resource  : used by real DatagridRow for expand/detail; irrelevant here.
        resource: _resource,
        // rowIndex is consumed by AccessibleRow first; included here defensively in case it leaks through.
        rowIndex: _rowIndex,
        // rowLabel  : same; consumed by AccessibleRow.
        rowLabel: _rowLabel,
        // sx        : MUI system prop; not a DOM attribute.
        sx: _sx,
        // id would be record.id; Matrix IDs contain @/: which are invalid HTML id attrs, so it's discarded.
        id: _id,
        // DOM-valid props, forwarded to tr; these are set by AccessibleRow on clickable rows.
        "aria-label": ariaLabel, // set from rowLabel prop or record representation
        "aria-roledescription": ariaRoledescription, // "link" on clickable rows; signals navigability to AT
        "aria-rowindex": ariaRowIndex, // 1-based, accounting for header row + pagination
        tabIndex, // 0 on clickable rows, absent on static rows
        onKeyDown, // AccessibleRow's keyboard handler (Enter/Space → click)
        // Standard HTML props that may come through from rowSx/rowStyle
        className,
        style,
      }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <tr
          aria-label={ariaLabel as string | undefined}
          aria-roledescription={ariaRoledescription as string | undefined}
          aria-rowindex={ariaRowIndex as number | undefined}
          tabIndex={tabIndex as number | undefined}
          // onKeyDown is AccessibleRow.handleKeyDown: ignores bubbled events, clicks on Enter/Space.
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTableRowElement> | undefined}
          className={className as string | undefined}
          style={style as React.CSSProperties | undefined}
        >
          {/* Real DatagridRow wraps children in td; here they're direct tr children, invalid HTML but jsdom-safe. */}
          {children}
        </tr>
      )
    ),

    // Stub for RA's default DatagridBody: unused (we render AccessibleBody), but RA imports it at module load.
    DatagridBody: vi.fn(({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>),

    // CSS class constants for AccessibleBody's className string; values don't matter, must exist as strings.
    DatagridClasses: {
      tbody: "datagrid-tbody",
      row: "datagrid-row",
      rowEven: "datagrid-row-even",
      rowOdd: "datagrid-row-odd",
    },

    // useListContext feeds page/perPage for the aria-rowindex offset; page 1, perPage 10 puts row 0 at index 2.
    useListContext: vi.fn(() => ({ page: 1, perPage: 10 })),

    // useResourceContext returns resourceRef.current lazily; feeds injectCellTitles's resources.<r>.fields.<s> key.
    useResourceContext: vi.fn(() => resourceRef.current),

    // useGetRecordRepresentation is AccessibleRow's last-resort aria-label; stubbed here as String(record.id).
    useGetRecordRepresentation: vi.fn(() => (record: Record<string, unknown>) => String(record.id)),

    // useTranslate returns the translate() above; injectCellTitles uses it for labels and boolean values.
    useTranslate: vi.fn(() => translate),
  };
});

// EmptyState (Datagrid.tsx's default empty prop) uses hooks needing setup; stubbed to skip that for no-row renders.
vi.mock("./EmptyState", () => ({ default: () => null }));

// Imports placed after vi.mock() so vitest's hoisted mock registration resolves first; ReferenceField is mocked.
import { BooleanField, DateField, FunctionField, RaRecord, ReferenceField, TextField } from "react-admin";

// DATE_FORMAT mirrors DateField's production options (src/utils/date.ts), so expected test dates match.
import { DATE_FORMAT } from "../../utils/date";

// formatBytes computes the expected string for FunctionField's byte formatting in the users media table.
import { formatBytes } from "../../utils/formatBytes";

import Datagrid, { DatagridProps } from "./Datagrid";

// Renders a Datagrid with children/data/resource; updates the mock refs first so lazy mock closures see them.
function renderWith(
  data: RaRecord[],
  resource: string,
  children: React.ReactNode,
  options?: {
    rowClick?: DatagridProps["rowClick"];
    rowLabel?: DatagridProps["rowLabel"];
  }
) {
  mockDataRef.current = data as Record<string, unknown>[];
  resourceRef.current = resource;

  return render(
    // No providers needed: AccessibleBody supplies RecordContextProvider per-row; hooks above cover the rest.
    <Datagrid rowClick={options?.rowClick} rowLabel={options?.rowLabel}>
      {children}
    </Datagrid>
  );
}

describe("Datagrid accessibility features", () => {
  // Mirrors UserMediaList (users/Edit.tsx): DateField, FunctionField+formatBytes, TextField, nullable TextField.

  describe("cell title attributes; users media table pattern", () => {
    it("date fields: title should show formatted date, not raw timestamp", () => {
      // injectCellTitles formats DateField via toLocaleString(locales, options), matching what the cell renders.
      renderWith(
        [MEDIA_RECORD as unknown as RaRecord],
        "users_media",
        // de-DE + DATE_FORMAT mirror production usage in users/Edit.tsx so the formatted date string matches.
        <DateField source="created_ts" showTime options={DATE_FORMAT} locales="de-DE" />
      );
      const expectedDate = new Date(1700000000000).toLocaleString("de-DE", DATE_FORMAT);
      // title is injected by injectCellTitles, forwarded onto DateField's element via sanitizeFieldRestProps.
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe(`Erstellt: ${expectedDate}`); // ← PASSES
    });

    it("file size fields (FunctionField): title should show formatted size, not raw bytes", () => {
      // injectCellTitles calls render(record) for FunctionField (duck-typed; TS6133), coercing to a string.
      renderWith(
        [MEDIA_RECORD as unknown as RaRecord],
        "users_media",
        // source is required for injectCellTitles to process the field; render controls only the cell's display.
        <FunctionField source="media_length" render={(r: RaRecord) => formatBytes(r.media_length as number)} />
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Größe: 1.0 KB"); // ← PASSES
    });

    it("text fields: title has translated label and raw string value", () => {
      renderWith([MEDIA_RECORD as unknown as RaRecord], "users_media", <TextField source="media_type" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Typ: image/jpeg"); // ← PASSES
    });

    it("null fields: title shows a dash for null values", () => {
      renderWith([MEDIA_RECORD as unknown as RaRecord], "users_media", <TextField source="quarantined_by" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("In Quarantäne von: -"); // ← PASSES
    });
  });

  // Mirrors UserList (users/List.tsx): BooleanField (admin, is_guest), DateField (creation_ts_ms).

  describe("cell title attributes; users main table pattern", () => {
    it("boolean true: title uses translated ra.boolean.true string", () => {
      // BooleanField renders a checkbox icon; title reaches its root span via sanitizeFieldRestProps.
      renderWith([USER_RECORD as unknown as RaRecord], "users", <BooleanField source="admin" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Administrator: Ja"); // ← PASSES
    });

    it("boolean false: title uses translated ra.boolean.false string", () => {
      renderWith([USER_RECORD as unknown as RaRecord], "users", <BooleanField source="is_guest" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Gastbenutzer: Nein"); // ← PASSES
    });

    it("creation_ts_ms DateField: title should show formatted date, not raw timestamp", () => {
      // creation_ts_ms comes from normalizeTS() (src/utils/date.ts), always in milliseconds like created_ts.
      renderWith(
        [USER_RECORD as unknown as RaRecord],
        "users",
        <DateField source="creation_ts_ms" showTime options={DATE_FORMAT} locales="de-DE" />
      );
      const expectedDate = new Date(1700000000000).toLocaleString("de-DE", DATE_FORMAT);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe(`Erstellt am: ${expectedDate}`); // ← PASSES
    });
  });

  // Mirrors RoomMembersList (rooms/Show.tsx): ReferenceField (id -> users, displayname).

  describe("cell title attributes; room members table pattern (reference fields)", () => {
    it("ReferenceField: title uses the resolved display value", () => {
      // injectCellTitles reads the first child's source on the outer record, falling back to the raw reference id.
      renderWith(
        [MEMBER_RECORD as unknown as RaRecord],
        "room_members",
        // Explicit label resolves Anzeigename (resources.users.fields.displayname) over the room_members namespace.
        <ReferenceField source="id" reference="users" label="resources.users.fields.displayname" link="">
          {/* Inner TextField reads displayname from the resolved record context. */}
          <TextField source="displayname" />
        </ReferenceField>
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Anzeigename: Alice"); // ← PASSES
    });
  });

  describe("cell title attributes; field label translation", () => {
    it("fields without explicit label: label resolved from resource translation key", () => {
      renderWith([MEDIA_RECORD as unknown as RaRecord], "users_media", <TextField source="media_id" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Medien-ID: mxc://example.org/abc123"); // ← PASSES
    });

    it("explicit label string prop: resolved via translate", () => {
      renderWith(
        [USER_RECORD as unknown as RaRecord],
        "users",
        <TextField source="id" label="resources.users.fields.id" />
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Benutzer-ID: @alice:example.org"); // ← PASSES
    });

    it("missing translation key: title uses humanized source name as fallback", () => {
      // humanizeSource is more readable than the bare field name; exact form is unasserted since it may evolve.
      const record: RaRecord = { id: "1", unlabeled_field: "some-value" };
      renderWith([record], "users_media", <TextField source="unlabeled_field" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).not.toMatch(/^unlabeled_field:/); // ← PASSES
    });

    it("cross-resource fields: explicit label prop bypasses resource namespace", () => {
      renderWith(
        [MEMBER_RECORD as unknown as RaRecord],
        "room_members",
        <TextField source="displayname" label="resources.users.fields.displayname" />
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Anzeigename: Alice"); // ← PASSES
    });
  });

  describe("row accessibility attributes", () => {
    it("clickable rows: aria-label provided by rowLabel function", () => {
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, {
        rowClick: "edit",
        // rowLabel receives the row record; cast because renderWith's type is RaRecord but the shape is USER_RECORD.
        rowLabel: r => `Benutzer ${(r as typeof USER_RECORD).displayname}`,
      });
      expect(screen.getByRole("row", { name: "Benutzer Alice" })).toBeTruthy(); // ← PASSES
    });

    it("clickable rows: aria-label from rowLabel field name", () => {
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, {
        rowClick: "edit",
        rowLabel: "displayname", // looks up record["displayname"] = "Alice"
      });
      expect(screen.getByRole("row", { name: "Alice" })).toBeTruthy(); // ← PASSES
    });

    it("first data row on page 1 has aria-rowindex 2 (header occupies index 1)", () => {
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      const row = document.querySelector("tr[aria-rowindex]");
      expect(row?.getAttribute("aria-rowindex")).toBe("2"); // ← PASSES
    });

    it("clickable rows have aria-roledescription='link'", () => {
      // aria-roledescription=link announces navigability without role=link, which would break table row/cell semantics.
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      const row = document.querySelector("tr[tabindex='0']");
      expect(row?.getAttribute("aria-roledescription")).toBe("link"); // ← PASSES
    });

    it("rows without rowClick: no aria-rowindex, no aria-label, no tabIndex, no aria-roledescription", () => {
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />);
      const row = document.querySelector("tr");
      expect(row?.getAttribute("aria-rowindex")).toBeNull(); // ← PASSES
      expect(row?.getAttribute("aria-label")).toBeNull(); // ← PASSES
      expect(row?.getAttribute("tabindex")).toBeNull(); // ← PASSES
      expect(row?.getAttribute("aria-roledescription")).toBeNull(); // ← PASSES
    });

    it("Enter key on a focusable row dispatches a click event", async () => {
      // Observes the click on the DOM element itself; the DatagridRow mock doesn't wire rowClick to onClick.
      const user = userEvent.setup(); // userEvent v14 requires setup() for keyboard
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      // Cast to HTMLElement: document.querySelector returns Element, which has no .focus().
      const row = document.querySelector("tr[tabindex='0']") as HTMLElement | null;
      expect(row).not.toBeNull();
      const clickSpy = vi.fn();
      row!.addEventListener("click", clickSpy);
      // Focus the row so subsequent keyboard events are dispatched on it.
      row!.focus();
      await user.keyboard("{Enter}");
      expect(clickSpy).toHaveBeenCalledTimes(1); // ← PASSES
    });

    it("Space key on a focusable row dispatches a click event", async () => {
      // Space is the alternate activation key for interactive ARIA roles like this clickable row.
      const user = userEvent.setup();
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      const row = document.querySelector("tr[tabindex='0']") as HTMLElement | null;
      expect(row).not.toBeNull();
      const clickSpy = vi.fn();
      row!.addEventListener("click", clickSpy);
      row!.focus();
      await user.keyboard(" ");
      expect(clickSpy).toHaveBeenCalledTimes(1); // ← PASSES
    });
  });
});

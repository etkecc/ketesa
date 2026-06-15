// SPDX-FileCopyrightText: 2026 Nikita Chernyi <https://etke.cc>
// SPDX-License-Identifier: Apache-2.0

/**
 * Regression suite for the custom Datagrid component's accessibility features
 * (src/components/layout/Datagrid.tsx).
 *
 * ─── PURPOSE ──────────────────────────────────────────────────────────────────
 * Verifies correct behavior for all field types handled by injectCellTitles and
 * all accessibility attributes added by AccessibleRow/AccessibleBody.
 * Tests are kept even after bugs are fixed; they act as regression guards.
 * "← PASSES" marks confirmed correct behavior; no "← FAILS" remain.
 *
 * ─── HOW THE COMPONENT WORKS ──────────────────────────────────────────────────
 * Datagrid wraps react-admin's DatagridConfigurable with two custom components:
 *
 *  AccessibleBody; replaces the default tbody.  For every row it:
 *    1. Resolves the resource via useResourceContext({ resource }) so that a
 *       missing resource prop falls back to the parent List's ResourceContext.
 *    2. Wraps the record in RecordContextProvider so child fields can read it.
 *    3. Calls injectCellTitles(children, record, resource, translate):
 *       – Maps over every direct child field element.
 *       – For each field that has a `source` prop:
 *         a. resolveLabel(label, source, resource, translate)
 *            → if label is a string  : translate(label)
 *            → else                  : translate(`resources.${resource}.fields.${source}`)
 *            → ultimate fallback     : humanizeSource(source)  e.g. "media_id" → "Media Id"
 *         b. Value resolution (field-type dispatch):
 *            DateField               : new Date(rawValue).toLocaleString(locales, options)
 *            ReferenceField          : record[firstChildSource] if present, else record[source]
 *            FunctionField (render)  : render(record) result as string/number, else rawValue
 *            everything else         : formatCellValue(record[source], translate)
 *              → null/undefined      : "—"
 *              → boolean             : translate("ra.boolean.true/false")
 *              → string/number       : String(value)
 *              → everything else     : "—"
 *         c. Clones the child with title=`${label}: ${value}`.
 *    4. Renders an AccessibleRow (described below) with the injected children.
 *
 *  AccessibleRow; replaces the default tr.  For clickable rows it:
 *    1. Adds tabIndex=0 so the row is keyboard-focusable.
 *    2. Adds a keyDown handler: Enter/Space → currentTarget.click()
 *       (guarded so events bubbled from inner interactive elements are ignored).
 *    3. Adds aria-rowindex (1-based, offset for header row + pagination page).
 *    4. Adds aria-label from the rowLabel prop (function or field name).
 *
 * ─── FIELD TYPE DETECTION ─────────────────────────────────────────────────────
 * injectCellTitles detects field types at render time to produce accurate titles:
 *
 *  DateField      : child.type === DateField (real import, works correctly)
 *  ReferenceField : typeof props.reference === "string"
 *    Duck-typed because child.type === ReferenceField triggers TS6133; TypeScript
 *    treats the === comparison as "never reads" the imported value and raises an
 *    "is declared but its value is never read" error.  The same constraint applies
 *    to FunctionField (see below).
 *  FunctionField  : typeof props.render === "function"
 *    Same TS6133 issue; duck-typed on the render prop instead.
 *
 * ─── CROSS-RESOURCE FIELDS ────────────────────────────────────────────────────
 * injectCellTitles only knows the Datagrid's own resource namespace.  Fields that
 * logically belong to a different resource (e.g. displayname from users, rendered
 * inside a room_members Datagrid) must carry an explicit label prop pointing to
 * the correct translation key, e.g. label="resources.users.fields.displayname".
 * Without it, resolveLabel consults the wrong namespace and falls back to the
 * humanized source name.
 *
 * ─── MOCK STRATEGY ────────────────────────────────────────────────────────────
 * We use a PARTIAL mock of "react-admin" (importOriginal + spread ...actual) so
 * that real field components render authentic DOM output:
 *   KEPT REAL  : DateField, TextField, BooleanField, FunctionField,
 *                RecordContextProvider, useRecordContext
 *   MOCKED     : DatagridConfigurable, DatagridRow, DatagridBody,
 *                DatagridClasses, useListContext, useResourceContext,
 *                useGetRecordRepresentation, useTranslate, ReferenceField
 *
 * ReferenceField is the only real field that is mocked because the real
 * implementation calls useGetManyAggregate → useDataProvider → useQueryClient,
 * which requires a full QueryClientProvider + DataProvider setup that is
 * disproportionate for this unit test.  Our lightweight mock replicates the
 * visual behavior (resolves and renders the display name) while remaining
 * self-contained.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── IMPORTANT: hoisting note ─────────────────────────────────────────────────
// vitest hoists vi.mock() calls to the top of the compiled output, before any
// import statements.  However, the factory functions passed to vi.mock() are
// closures; they are REGISTERED at hoist time but EXECUTED lazily, only when
// "react-admin" is first imported during test setup.  By that point all
// module-level const/let declarations below have already been evaluated, so
// closures that reference them (e.g. `() => translate` or `mockDataRef.current`)
// are safe from Temporal Dead Zone errors even though they appear after the
// vi.mock() call in the source.

// ─── Translation dictionary ────────────────────────────────────────────────────
// An invented, non-English set of strings that mimics a real locale file.
// Using invented strings (rather than importing the real DE locale) keeps the
// test self-contained and immune to locale file changes.
//
// Key design decisions:
//   - "resources.room_members.fields.displayname" is intentionally ABSENT.
//     This exposes Bug #5 (wrong resource context).
//   - No "resources.*.fields.unlabeled_field" key exists anywhere.
//     This exposes Bug #4 (missing translation → source name fallback).
//   - "ra.boolean.true/false" ARE present so boolean title tests can PASS,
//     proving that the boolean translation path works correctly.
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

/**
 * Simulates the translate() function returned by useTranslate() in the test.
 *
 * Lookup order (matches react-admin's polyglot provider behavior):
 *   1. Exact key match in TRANSLATIONS.
 *   2. The `_` option (fallback value supplied by the caller).
 *   3. The raw key string itself (last-resort fallback).
 *
 * This is the function that injectCellTitles calls internally via
 * useTranslate() when resolving field labels and boolean values.
 *
 * @param key  - The i18n translation key (e.g. "resources.users.fields.id")
 * @param opts - Optional object; opts._ is the caller-supplied fallback string
 * @returns    The translated string, the fallback, or the raw key
 */
const translate = (key: string, opts?: Record<string, unknown>): string =>
  TRANSLATIONS[key] ?? (opts?._ as string | undefined) ?? key;

// ─── Reference resolution data ────────────────────────────────────────────────
// Simulates the records that a real DataProvider would return when
// ReferenceField fetches users by their Matrix ID.
// Used by the ReferenceField mock (see below) to replicate reference resolution
// without needing a QueryClient or DataProvider in scope.
const RESOLVED_USERS: Record<string, Record<string, unknown>> = {
  // Key = Matrix user ID (the value of the `source` field on the outer record)
  // Value = the record that would be returned by GET /users/:id
  "@alice:example.org": { id: "@alice:example.org", displayname: "Alice" },
};

// ─── Test records ──────────────────────────────────────────────────────────────
// Each record mirrors the shape returned by the Synapse Admin API for that
// resource.  They are typed loosely here and cast to RaRecord at render time
// because RaRecord requires Identifier (string | number) for id, while these
// objects use concrete types the tests can inspect easily.

/**
 * A users_media record.  Mirrors the shape used by UserMediaList in
 * src/resources/users/Edit.tsx.  Key values chosen to expose bugs:
 *   - created_ts/last_access_ts : millisecond timestamps (not Date objects)
 *     so the title will show a raw integer, not a formatted date.
 *   - media_length 1024         : formatBytes(1024) = "1.0 KB" so we can
 *     assert the title should show "1.0 KB" but actually shows "1024".
 *   - quarantined_by null       : exercises the "—" fallback in formatCellValue.
 */
const MEDIA_RECORD = {
  id: "1",
  media_id: "mxc://example.org/abc123",
  created_ts: 1700000000000, // 2023-11-14T22:13:20.000Z in milliseconds
  last_access_ts: 1699900000000,
  media_length: 1024, // bytes; formatBytes(1024) = "1.0 KB"
  media_type: "image/jpeg",
  upload_name: "photo.jpg",
  quarantined_by: null, // null → title value should be "—"
};

/**
 * A users record.  Mirrors the shape used by UserList in
 * src/resources/users/List.tsx.  Key values:
 *   - id          : a Matrix user ID containing special chars (@, :); these
 *     are valid in Matrix but invalid as HTML id attributes, so DatagridRow
 *     mock must NOT spread `id` onto <tr>.
 *   - creation_ts_ms : same millisecond-timestamp bug as created_ts above.
 *   - admin true  : exercises the boolean translation path ("Ja").
 *   - is_guest false : exercises the boolean false path ("Nein").
 */
const USER_RECORD = {
  id: "@alice:example.org",
  displayname: "Alice",
  admin: true,
  creation_ts_ms: 1700000000000,
  is_guest: false,
};

/**
 * A room_members record (minimal; only the fields the room-members Datagrid
 * actually uses).  The displayname field is here to support two tests:
 *   - ReferenceField test: the outer record's `id` is the source; the mock
 *     ReferenceField resolves RESOLVED_USERS["@alice:example.org"].displayname.
 *   - Wrong-resource-context test: a plain TextField(source="displayname")
 *     should look up resources.room_members.fields.displayname, which is absent,
 *     so it falls back to the bare source name "displayname".
 */
const MEMBER_RECORD = {
  id: "@alice:example.org",
  displayname: "Alice",
};

// ─── Mock control refs ─────────────────────────────────────────────────────────
// These plain objects act as mutable cells that the vi.mock() factory closures
// read at call-time.  We use object wrappers (not bare let variables) because:
//   a) `const` objects can have their properties mutated.
//   b) The factory closures capture the binding at registration time, but only
//      dereference `.current` when the mock function is actually called
//      (during a test render), by which time renderWith() has already set the
//      correct values.
//
// Alternative pattern: vi.fn() stubs + mockReturnValue() in renderWith().
// We chose refs because it avoids importing mock references before they're
// needed and keeps renderWith() as the single point of mutation.

/** The array of records that DatagridConfigurable mock passes to AccessibleBody as `data`. */
const mockDataRef: { current: Record<string, unknown>[] } = { current: [] };

/** The resource name that DatagridConfigurable and useResourceContext return for the current render. */
const resourceRef: { current: string } = { current: "users" };

// ─── react-admin partial mock ──────────────────────────────────────────────────
// `async importOriginal` gives us the real module so we can spread ...actual
// and keep real field components working.  Only items that need a full
// AdminContext (DataProvider, QueryClientProvider, etc.) are replaced.
//
// Why partial rather than full mock?
// Full mock: we write fake implementations for DateField, BooleanField, etc.
//   → we lose the authentic rendering behavior; a bug in our fake fields
//     could mask or invent issues that don't exist in production.
// Partial mock: real fields render exactly as they do in production.
//   → the test proves that the rendered output and the injected title disagree,
//     which is the real bug we want to catch.

vi.mock("react-admin", async importOriginal => {
  // `actual` contains the real, unmocked react-admin exports.
  // We destructure RecordContextProvider and useRecordContext here so the
  // ReferenceField mock below can use them without going through the mock
  // object (which would create a circular reference).
  const actual = await importOriginal<typeof import("react-admin")>();
  const { RecordContextProvider, useRecordContext } = actual;

  return {
    // Spread first so all real exports are available as defaults.
    // Individual overrides below shadow specific keys.
    ...actual,

    // ── ReferenceField lightweight mock ────────────────────────────────────────
    // Why mocked: the real ReferenceField calls useGetManyAggregate internally.
    // useGetManyAggregate → useDataProvider → @tanstack/react-query's
    // useQueryClient, which throws "No QueryClient set" unless the render tree
    // includes a QueryClientProvider.  Setting up QueryClientProvider requires a
    // DataProvider mock as well, which is disproportionate for this unit test.
    //
    // What this mock does instead:
    //   1. Calls useRecordContext() (REAL; reads from RecordContextProvider set
    //      by AccessibleBody) to get the current row record.
    //   2. Reads record[source] to find the reference ID (e.g. "@alice:example.org").
    //   3. Looks up RESOLVED_USERS[id] to simulate what a real DataProvider would
    //      return for that ID.
    //   4. Wraps children in RecordContextProvider (REAL) with the resolved record
    //      so the inner TextField reads displayname = "Alice" from context.
    //   5. Renders a <span title={title}> so the `title` prop injected by
    //      injectCellTitles DOES appear in the DOM; this is the key difference
    //      from the real ReferenceField, which is a pure context provider and
    //      renders NO DOM element, meaning the title would be silently discarded.
    //
    // What the test asserts:
    //   injectCellTitles detects ReferenceField via typeof props.reference === "string",
    //   reads the first child's source ("displayname"), and looks it up on the outer
    //   record: record["displayname"] = "Alice".  The injected title is therefore
    //   "Anzeigename: Alice"; the resolved display name, not the raw ID.
    ReferenceField: vi.fn(
      ({
        children,
        // `source`; the field on the outer record whose value is the reference
        // ID, e.g. source="id" → record["id"] = "@alice:example.org".
        source,
        // `reference`; the resource to fetch from, e.g. "users".
        reference,
        // `title`; injected by injectCellTitles as "Label: resolved-display-value".
        // We pass this through to the DOM <span> so tests can assert on it.
        title,
        // Consume all other props (label, link, sortable, etc.) silently
        // so they don't reach the DOM and trigger React unknown-prop warnings.
      }: {
        children?: React.ReactNode;
        source: string;
        reference: string;
        title?: string;
        [k: string]: unknown;
      }) => {
        // Read the current row record from the RecordContextProvider that
        // AccessibleBody wraps around each row.  This is the OUTER record
        // (e.g. the room_members row), not the RESOLVED user record.
        const record = useRecordContext() as Record<string, unknown> | undefined;

        // Derive the reference ID from the outer record using the source prop.
        // e.g. source="id", record.id = "@alice:example.org" → "@alice:example.org"
        const sourceId = record ? String(record[source] ?? "") : "";

        // Simulate DataProvider.getMany: look up the resolved record.
        // In production, ReferenceField batches these lookups via React Query.
        // Here we read directly from RESOLVED_USERS for simplicity.
        const resolved =
          reference === "users" ? (RESOLVED_USERS[sourceId] as import("react-admin").RaRecord) : undefined;

        return (
          // The <span title={title}> wrapper is the critical difference from the
          // real ReferenceField: it makes the injected title visible in the DOM.
          // The real ReferenceField has no DOM element, so its title prop is lost.
          <span title={title}>
            {/*
             * Provide the RESOLVED record as context so child fields (e.g.
             * <TextField source="displayname">) render the reference's value
             * ("Alice") rather than trying to read from the outer record.
             * Falls back to an empty record when resolution fails.
             */}
            <RecordContextProvider value={resolved ?? ({ id: "" } as import("react-admin").RaRecord)}>
              {children}
            </RecordContextProvider>
          </span>
        );
      }
    ),

    // ── DatagridConfigurable mock ───────────────────────────────────────────────
    // Why mocked: the real DatagridConfigurable renders a MUI Table, sets up
    // column preferences (requires Store context), and passes data from
    // ListContext to the body.  All of this requires a full AdminContext.
    //
    // What this mock does:
    //   It receives `body` (which is `<AccessibleBody rowLabel={...} />` as
    //   constructed by Datagrid.tsx) and cloneElement's it with the test data
    //   and resource.  This bypasses the RA table infrastructure while still
    //   exercising AccessibleBody (which is the component under test).
    //
    // Data flow: renderWith() sets mockDataRef.current → this mock reads it
    //   when called → passes it to AccessibleBody as the `data` prop.
    DatagridConfigurable: vi.fn(
      ({
        // `body` is `<AccessibleBody rowLabel={rowLabel} />`.  The rowLabel prop
        // is already baked into the element by Datagrid.tsx before this mock
        // receives it, so we don't need to thread it through separately.
        body,
        // `children` are the field elements (TextField, DateField, etc.) passed
        // as children of the <Datagrid> in the test.  AccessibleBody receives
        // them via the `children` prop and processes them in injectCellTitles.
        children,
        // `rowClick` is forwarded so AccessibleRow can determine whether the row
        // is clickable (affects tabIndex, keyboard handler, aria attributes).
        rowClick,
        // All other DatagridConfigurable props (sx, sort, bulkActionButtons, etc.)
        // are ignored; they are irrelevant to the accessibility features we test.
      }: {
        body: React.ReactElement;
        children?: React.ReactNode;
        rowClick?: unknown;
        [k: string]: unknown;
      }) =>
        React.cloneElement(
          // Cast required because body's prop type is unknown to TypeScript here;
          // at runtime it is AccessibleBodyProps which accepts all these fields.
          body as React.ReactElement<Record<string, unknown>>,
          {
            // Records to render; set by renderWith() before each test render.
            data: mockDataRef.current,
            // Resource name; used by resolveLabel() to construct the i18n key
            // (e.g. "resources.users_media.fields.created_ts").
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

    // ── DatagridRow mock ────────────────────────────────────────────────────────
    // Why mocked: the real DatagridRow renders each child field into a
    // DatagridCell (<td>) with its own styling, expand logic, and checkbox.
    // All of this requires Store context (for column show/hide preferences).
    //
    // What this mock does:
    //   Renders a bare <tr> forwarding only the DOM-valid props that our
    //   accessibility tests need to inspect.  RA-specific props (rowClick, sx,
    //   hover, expand, etc.) are explicitly destructured and discarded to prevent
    //   React's "unknown DOM attribute" warning.
    //
    // Why children are direct <tr> children instead of inside <td> wrappers:
    //   The field components render their own DOM (Typography/span/time), so
    //   having them as direct children of <tr> violates HTML table rules but
    //   works fine in jsdom for attribute inspection and role queries.
    DatagridRow: vi.fn(
      ({
        children,
        // ── RA-specific props (consumed and ignored) ────────────────────────
        // rowClick  : handled by AccessibleRow; DatagridRow doesn't need it here.
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
        // rowIndex  : consumed by AccessibleRow before reaching DatagridRow;
        //             included here defensively in case it leaks through.
        rowIndex: _rowIndex,
        // rowLabel  : same; consumed by AccessibleRow.
        rowLabel: _rowLabel,
        // sx        : MUI system prop; not a DOM attribute.
        sx: _sx,
        // id        : would be record.id (e.g. "@alice:example.org").
        //             Matrix IDs contain "@" and ":" which are invalid in HTML id
        //             attribute values, so we discard this to avoid jsdom warnings.
        id: _id,
        // ── DOM-valid props (forwarded to <tr>) ─────────────────────────────
        // These are set by AccessibleRow on clickable rows.
        "aria-label": ariaLabel, // set from rowLabel prop or record representation
        "aria-roledescription": ariaRoledescription, // "link" on clickable rows; signals navigability to AT without breaking table ARIA hierarchy
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
          // onKeyDown is AccessibleRow.handleKeyDown:
          //   if (e.target !== e.currentTarget) return;  ← guards against child events
          //   if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTableRowElement> | undefined}
          className={className as string | undefined}
          style={style as React.CSSProperties | undefined}
        >
          {/*
           * In production, DatagridRow wraps each child in a DatagridCell (<td>).
           * Here we render children directly in <tr>.  This is invalid HTML but
           * jsdom accepts it and does not affect any attribute we assert on.
           */}
          {children}
        </tr>
      )
    ),

    // ── DatagridBody mock ────────────────────────────────────────────────────────
    // The default DatagridBody from RA.  Not exercised in our tests (we use
    // AccessibleBody instead), but RA imports DatagridBody at module load time
    // and would throw if it tried to render it.  A minimal stub is sufficient.
    DatagridBody: vi.fn(({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>),

    // ── DatagridClasses mock ────────────────────────────────────────────────────
    // CSS class name constants used by AccessibleBody when assembling the
    // className string for each row.  The values don't affect our assertions
    // but must exist as strings so the template literals in AccessibleBody
    // don't produce "undefined" in the className.
    DatagridClasses: {
      tbody: "datagrid-tbody",
      row: "datagrid-row",
      rowEven: "datagrid-row-even",
      rowOdd: "datagrid-row-odd",
    },

    // ── Hook mocks ──────────────────────────────────────────────────────────────

    // useListContext: provides `page` and `perPage` used by AccessibleBody to
    // calculate aria-rowindex offset.
    //   offset = (page - 1) * perPage = (1 - 1) * 10 = 0
    //   first row aria-rowindex = offset + rowIndex(0) + 2 = 2
    // (The +2 accounts for: +1 to convert 0-based rowIndex to 1-based,
    //  +1 for the header row which occupies aria-rowindex 1.)
    useListContext: vi.fn(() => ({ page: 1, perPage: 10 })),

    // useResourceContext: returns the current resource name.
    // AccessibleBody passes this to injectCellTitles, which uses it to build
    // the translation key:  resources.${resource}.fields.${source}
    // Value is read lazily from resourceRef.current at call time.
    useResourceContext: vi.fn(() => resourceRef.current),

    // useGetRecordRepresentation: used by AccessibleRow as the last-resort
    // aria-label generator when no rowLabel prop is provided.
    // Returns a function that converts any record to a string.
    // In production this uses the resource's recordRepresentation setting;
    // here we always return String(record.id) which is sufficient for testing.
    useGetRecordRepresentation: vi.fn(() => (record: Record<string, unknown>) => String(record.id)),

    // useTranslate: returns the `translate` function defined above.
    // injectCellTitles uses this to:
    //   a) Resolve field labels (resolveLabel)
    //   b) Format boolean values (formatCellValue: "Ja"/"Nein")
    // Value is read lazily from the `translate` closure at call time.
    useTranslate: vi.fn(() => translate),
  };
});

// EmptyState is imported by Datagrid.tsx as the default `empty` prop.
// It uses useResourceContext and other hooks; stub it out to avoid
// setting up the resource context for renders that produce no rows.
vi.mock("./EmptyState", () => ({ default: () => null }));

// ─── Post-mock imports ─────────────────────────────────────────────────────────
// These must be after the vi.mock() calls in the source so that vitest's
// hoisting transformer places the vi.mock() registrations before these imports
// are resolved.  At runtime, these imports receive the mocked/partial-mocked
// versions of the modules.
//
// BooleanField, DateField, FunctionField, TextField; kept REAL (from ...actual)
//   so their DOM output is authentic.
// ReferenceField; MOCKED (see above).
// RaRecord; type only; not mocked.
import { BooleanField, DateField, FunctionField, RaRecord, ReferenceField, TextField } from "react-admin";

// DATE_FORMAT; the Intl.DateTimeFormatOptions used by the actual DateField
// calls in production (src/utils/date.ts).  Imported here so the expected date
// string in tests is computed with the same format options.
import { DATE_FORMAT } from "../../utils/date";

// formatBytes; the human-readable byte formatter used by FunctionField in the
// users media table.  Imported here to compute the expected formatted string.
import { formatBytes } from "../../utils/formatBytes";

// Datagrid; the component under test.
// DatagridProps; needed for typing the rowClick/rowLabel options in renderWith.
import Datagrid, { DatagridProps } from "./Datagrid";

// ─── renderWith helper ─────────────────────────────────────────────────────────
/**
 * Renders a Datagrid containing `children` for the given `data` and `resource`,
 * optionally with row click and row label options.
 *
 * Before rendering it updates the mock control refs so DatagridConfigurable and
 * useResourceContext return the correct values for this specific render.
 *
 * @param data     - Array of records to render (each becomes one row).
 * @param resource - The resource name; controls the translation key namespace
 *                   used by injectCellTitles (e.g. "users_media", "users").
 * @param children - Field elements to render inside the Datagrid.
 * @param options  - Optional rowClick and rowLabel props.
 *                     rowClick: when set (e.g. "edit"), rows become keyboard-
 *                       focusable and receive aria-* attributes.
 *                     rowLabel: function or field name for aria-label.
 */
function renderWith(
  data: RaRecord[],
  resource: string,
  children: React.ReactNode,
  options?: {
    rowClick?: DatagridProps["rowClick"];
    rowLabel?: DatagridProps["rowLabel"];
  }
) {
  // Update refs before render so the lazy closures in vi.mock() pick up the
  // correct values when called during React's render phase.
  mockDataRef.current = data as Record<string, unknown>[];
  resourceRef.current = resource;

  return render(
    // No providers needed; RecordContextProvider is supplied per-row by
    // AccessibleBody (using the real implementation from ...actual), and all
    // other context requirements are satisfied by the mocked hooks above.
    <Datagrid rowClick={options?.rowClick} rowLabel={options?.rowLabel}>
      {children}
    </Datagrid>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Datagrid accessibility features", () => {
  // ── Users media table pattern ─────────────────────────────────────────────
  // Mirrors src/resources/users/Edit.tsx → UserMediaList.
  // Fields: DateField (timestamps), FunctionField+formatBytes (file size),
  //         TextField (plain strings), nullable TextField (quarantined_by).

  describe("cell title attributes; users media table pattern", () => {
    it("date fields: title should show formatted date, not raw timestamp", () => {
      // injectCellTitles detects DateField via child.type === DateField and
      // formats the timestamp using:
      //   new Date(record["created_ts"]).toLocaleString(locales, options)
      // passing through the field's own locales/options props so the title
      // matches exactly what DateField renders in the cell.
      renderWith(
        [MEDIA_RECORD as unknown as RaRecord],
        "users_media",
        // locales="de-DE" and DATE_FORMAT mirror the production usage in
        // src/resources/users/Edit.tsx so the formatted date string matches.
        <DateField source="created_ts" showTime options={DATE_FORMAT} locales="de-DE" />
      );
      // Compute the CORRECT expected title using the same locale and options
      // that DateField uses in production.
      const expectedDate = new Date(1700000000000).toLocaleString("de-DE", DATE_FORMAT);
      // document.querySelector("[title]") finds the <time> or <span> element
      // that DateField renders.  The `title` attribute is injected by
      // injectCellTitles and forwarded via sanitizeFieldRestProps.
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe(`Erstellt: ${expectedDate}`); // ← PASSES
    });

    it("file size fields (FunctionField): title should show formatted size, not raw bytes", () => {
      // injectCellTitles detects FunctionField via typeof props.render === "function"
      // (child.type === FunctionField triggers TS6133, so duck-typing is used).
      // It calls render(record) and coerces the result to a string, so the title
      // matches what the cell displays: formatBytes(1024) = "1.0 KB".
      renderWith(
        [MEDIA_RECORD as unknown as RaRecord],
        "users_media",
        // source="media_length" is required so injectCellTitles processes this
        // field.  Without source, the field would be passed through unchanged.
        // The render prop is what actually controls the display value ("1.0 KB");
        // injectCellTitles ignores it and reads record[source] directly.
        <FunctionField source="media_length" render={(r: RaRecord) => formatBytes(r.media_length as number)} />
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Größe: 1.0 KB"); // ← PASSES
    });

    it("text fields: title has translated label and raw string value", () => {
      // CORRECT BEHAVIOR; plain string values work fine.
      //
      // record["media_type"] = "image/jpeg" (a string).
      // formatCellValue("image/jpeg") = String("image/jpeg") = "image/jpeg".
      // resolveLabel(undefined, "media_type", "users_media", translate)
      //   → translate("resources.users_media.fields.media_type") = "Typ".
      // title = "Typ: image/jpeg" ✓
      renderWith([MEDIA_RECORD as unknown as RaRecord], "users_media", <TextField source="media_type" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Typ: image/jpeg"); // ← PASSES
    });

    it("null fields: title shows em dash for null values", () => {
      // CORRECT BEHAVIOR; null values are formatted as the em dash character.
      //
      // record["quarantined_by"] = null.
      // formatCellValue(null) → (value == null) → returns "—".
      // title = "In Quarantäne von: —" ✓
      renderWith([MEDIA_RECORD as unknown as RaRecord], "users_media", <TextField source="quarantined_by" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("In Quarantäne von: —"); // ← PASSES
    });
  });

  // ── Users main table pattern ───────────────────────────────────────────────
  // Mirrors src/resources/users/List.tsx → UserList.
  // Fields: BooleanField (admin, is_guest), DateField (creation_ts_ms).

  describe("cell title attributes; users main table pattern", () => {
    it("boolean true: title uses translated ra.boolean.true string", () => {
      // CORRECT BEHAVIOR; boolean true is translated.
      //
      // record["admin"] = true (a boolean).
      // formatCellValue(true) = translate("ra.boolean.true", { _: "Yes" })
      //   → TRANSLATIONS["ra.boolean.true"] = "Ja".
      // resolveLabel → translate("resources.users.fields.admin") = "Administrator".
      // title = "Administrator: Ja" ✓
      //
      // Note: BooleanField from react-admin renders a checkbox icon.
      // It passes the injected `title` prop to its root <span> via
      // sanitizeFieldRestProps, so document.querySelector("[title]") finds it.
      renderWith([USER_RECORD as unknown as RaRecord], "users", <BooleanField source="admin" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Administrator: Ja"); // ← PASSES
    });

    it("boolean false: title uses translated ra.boolean.false string", () => {
      // CORRECT BEHAVIOR; boolean false is translated.
      //
      // record["is_guest"] = false.
      // formatCellValue(false) = translate("ra.boolean.false", { _: "No" }) = "Nein".
      // title = "Gastbenutzer: Nein" ✓
      renderWith([USER_RECORD as unknown as RaRecord], "users", <BooleanField source="is_guest" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Gastbenutzer: Nein"); // ← PASSES
    });

    it("creation_ts_ms DateField: title should show formatted date, not raw timestamp", () => {
      // Same DateField handling as created_ts above.
      // creation_ts_ms is produced by normalizeTS() (src/utils/date.ts) and is
      // always in milliseconds.  injectCellTitles formats it via toLocaleString
      // so the title matches the cell.
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

  // ── Room members table pattern ─────────────────────────────────────────────
  // Mirrors src/resources/rooms/Show.tsx → RoomMembersList.
  // Fields: ReferenceField (id → users, displayname).

  describe("cell title attributes; room members table pattern (reference fields)", () => {
    it("ReferenceField: title should show resolved display value, not raw source ID", () => {
      // injectCellTitles detects ReferenceField via typeof props.reference === "string"
      // (child.type === ReferenceField triggers TS6133, so duck-typing is used).
      // It reads the first child's source ("displayname") and looks it up on the
      // outer record: record["displayname"] = "Alice".  Falls back to the raw
      // reference ID (record["id"]) when the display field is absent on the row.
      //
      // Note on the real ReferenceField: it is a pure React context provider with
      // no DOM element, so a `title` injected directly on it would be silently
      // discarded.  Our mock wraps children in <span title={title}> to make the
      // injected value visible in the DOM for this assertion.
      renderWith(
        [MEMBER_RECORD as unknown as RaRecord],
        "room_members",
        // label is explicit so injectCellTitles resolves "Anzeigename" (from
        // resources.users.fields.displayname) rather than falling back to
        // "resources.room_members.fields.id" or the source name "id".
        <ReferenceField source="id" reference="users" label="resources.users.fields.displayname" link="">
          {/* Inner TextField reads displayname from the resolved record context. */}
          <TextField source="displayname" />
        </ReferenceField>
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Anzeigename: Alice"); // ← PASSES
    });
  });

  // ── Field label translation ────────────────────────────────────────────────

  describe("cell title attributes; field label translation", () => {
    it("fields without explicit label: label resolved from resource translation key", () => {
      // CORRECT BEHAVIOR; implicit label resolution works.
      //
      // resolveLabel(undefined, "media_id", "users_media", translate):
      //   label prop is undefined → no explicit label.
      //   Falls through to: translate("resources.users_media.fields.media_id")
      //   → TRANSLATIONS["resources.users_media.fields.media_id"] = "Medien-ID".
      // formatCellValue("mxc://example.org/abc123") = "mxc://example.org/abc123".
      // title = "Medien-ID: mxc://example.org/abc123" ✓
      renderWith([MEDIA_RECORD as unknown as RaRecord], "users_media", <TextField source="media_id" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Medien-ID: mxc://example.org/abc123"); // ← PASSES
    });

    it("explicit label string prop: resolved via translate", () => {
      // CORRECT BEHAVIOR; explicit translation key label works.
      //
      // resolveLabel("resources.users.fields.id", "id", "users", translate):
      //   label prop is the string "resources.users.fields.id".
      //   translate("resources.users.fields.id", { _: "resources.users.fields.id" })
      //   → TRANSLATIONS["resources.users.fields.id"] = "Benutzer-ID".
      // formatCellValue("@alice:example.org") = "@alice:example.org".
      // title = "Benutzer-ID: @alice:example.org" ✓
      renderWith(
        [USER_RECORD as unknown as RaRecord],
        "users",
        <TextField source="id" label="resources.users.fields.id" />
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Benutzer-ID: @alice:example.org"); // ← PASSES
    });

    it("missing translation key: title uses humanized source name as fallback", () => {
      // When no translation key exists for a field, resolveLabel falls back to
      // humanizeSource(source) which converts snake_case/camelCase to Title Case:
      //   "unlabeled_field" → "Unlabeled Field"
      // This is more readable than the bare API field name and avoids exposing
      // internal naming to screen-reader users.
      //
      // The assertion uses .not.toMatch(/^unlabeled_field:/) to confirm the raw
      // source name is not used; the exact humanized form is not asserted because
      // the humanization algorithm may evolve.
      const record: RaRecord = { id: "1", unlabeled_field: "some-value" };
      renderWith([record], "users_media", <TextField source="unlabeled_field" />);
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).not.toMatch(/^unlabeled_field:/); // ← PASSES
    });

    it("cross-resource fields: explicit label prop bypasses resource namespace", () => {
      // injectCellTitles only knows the Datagrid's own resource ("room_members")
      // and resolves labels from that namespace.  When a field logically belongs
      // to a different resource (e.g. "displayname" comes from the users resource),
      // its translation key is absent in the Datagrid's namespace.
      //
      // The solution: supply an explicit label prop on cross-resource fields,
      // e.g. label="resources.users.fields.displayname".  resolveLabel then calls
      // translate(label) directly, bypassing the Datagrid's resource namespace.
      renderWith(
        [MEMBER_RECORD as unknown as RaRecord],
        "room_members",
        <TextField source="displayname" label="resources.users.fields.displayname" />
      );
      const el = document.querySelector("[title]");
      expect(el?.getAttribute("title")).toBe("Anzeigename: Alice"); // ← PASSES
    });
  });

  // ── Row accessibility attributes ───────────────────────────────────────────

  describe("row accessibility attributes", () => {
    it("clickable rows: aria-label provided by rowLabel function", () => {
      // CORRECT BEHAVIOR; function rowLabel generates a descriptive aria-label.
      //
      // AccessibleRow evaluates: typeof rowLabel === "function"
      //   → ariaLabel = rowLabel(record)
      //   → `Benutzer ${record.displayname}` = "Benutzer Alice"
      // Placed on the <tr> as aria-label="Benutzer Alice".
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, {
        rowClick: "edit",
        // Arrow function receives the current row record; we cast because
        // renderWith accepts RaRecord but the concrete shape is USER_RECORD.
        rowLabel: r => `Benutzer ${(r as typeof USER_RECORD).displayname}`,
      });
      // screen.getByRole("row", { name }) matches <tr aria-label="Benutzer Alice">.
      expect(screen.getByRole("row", { name: "Benutzer Alice" })).toBeTruthy(); // ← PASSES
    });

    it("clickable rows: aria-label from rowLabel field name", () => {
      // CORRECT BEHAVIOR; string rowLabel looks up the named field on the record.
      //
      // AccessibleRow evaluates: typeof rowLabel === "string"
      //   → ariaLabel = String(record["displayname"] ?? record.id) = "Alice"
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, {
        rowClick: "edit",
        rowLabel: "displayname", // looks up record["displayname"] = "Alice"
      });
      expect(screen.getByRole("row", { name: "Alice" })).toBeTruthy(); // ← PASSES
    });

    it("first data row on page 1 has aria-rowindex 2 (header occupies index 1)", () => {
      // CORRECT BEHAVIOR; aria-rowindex calculation.
      //
      // From AccessibleBody:
      //   page = 1, perPage = 10 (mocked by useListContext)
      //   offset = (1 - 1) * 10 = 0
      //   For the first row (rowIndex = 0):
      //     aria-rowindex = offset + rowIndex + 2 = 0 + 0 + 2 = 2
      //
      // The +2 formula: +1 because aria-rowindex is 1-based, and the header row
      // is aria-rowindex=1 so data rows start at 2.
      // (There is no explicit <tr> for the header in this mock, but the ARIA
      //  spec expects the numbering to account for it.)
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      const row = document.querySelector("tr[aria-rowindex]");
      expect(row?.getAttribute("aria-rowindex")).toBe("2"); // ← PASSES
    });

    it("clickable rows have aria-roledescription='link'", () => {
      // aria-roledescription="link" on the <tr> tells screen readers to announce
      // the row as "link [aria-label]" in browse mode, signalling navigability
      // without using role="link" (which would break the table row/cell hierarchy).
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      const row = document.querySelector("tr[tabindex='0']");
      expect(row?.getAttribute("aria-roledescription")).toBe("link"); // ← PASSES
    });

    it("rows without rowClick: no aria-rowindex, no aria-label, no tabIndex, no aria-roledescription", () => {
      // CORRECT BEHAVIOR; non-clickable rows have no accessibility overhead.
      //
      // AccessibleRow checks: isClickable = rowClick != null && rowClick !== false
      // When rowClick is not provided, isClickable = false → the entire
      // aria/tabIndex block in AccessibleRow is skipped.
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />);
      // No rowClick option → isClickable = false
      const row = document.querySelector("tr");
      expect(row?.getAttribute("aria-rowindex")).toBeNull(); // ← PASSES
      expect(row?.getAttribute("aria-label")).toBeNull(); // ← PASSES
      expect(row?.getAttribute("tabindex")).toBeNull(); // ← PASSES
      expect(row?.getAttribute("aria-roledescription")).toBeNull(); // ← PASSES
    });

    it("Enter key on a focusable row dispatches a click event", async () => {
      // CORRECT BEHAVIOR; keyboard navigation via Enter key.
      //
      // AccessibleRow.handleKeyDown:
      //   if (e.target !== e.currentTarget) return;  ← ignores bubbled events
      //   if (e.key === "Enter") e.currentTarget.click();
      //
      // We test this by:
      //   1. Focusing the <tr> (possible because tabIndex=0 is set).
      //   2. Sending a keyboard Enter event via userEvent.
      //   3. Asserting that a "click" DOM event was dispatched on the row.
      //
      // We observe the click event directly on the DOM element (not via the
      // rowClick prop) because our DatagridRow mock does not wire rowClick to
      // an onClick handler; the real DatagridRow would, but we only need to
      // verify that AccessibleRow dispatches the click, not that RA handles it.
      const user = userEvent.setup(); // userEvent v14 requires setup() for keyboard
      renderWith([USER_RECORD as unknown as RaRecord], "users", <TextField source="id" />, { rowClick: "edit" });
      // Cast to HTMLElement because document.querySelector returns Element which
      // does not have .focus(); HTMLElement does.
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
      // CORRECT BEHAVIOR; keyboard navigation via Space key.
      // Same mechanism as Enter above; Space is the alternative activation key
      // for interactive ARIA roles (role="row" with tabIndex acts like a button).
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

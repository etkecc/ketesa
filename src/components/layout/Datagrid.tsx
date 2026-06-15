// SPDX-FileCopyrightText: 2026 Nikita Chernyi
// SPDX-License-Identifier: Apache-2.0
import React, { ReactNode, useCallback } from "react";
import { SxProps, TableBody } from "@mui/material";
import {
  DatagridBody,
  DatagridClasses,
  DatagridConfigurable,
  DatagridRow,
  DateField,
  Identifier,
  ListContext,
  RaRecord,
  RecordContextProvider,
  useGetRecordRepresentation,
  useRecordContext,
  useResourceContext,
  useTranslate,
} from "react-admin";
import EmptyState from "./EmptyState";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type DatagridBodyProps = React.ComponentPropsWithRef<typeof DatagridBody>;
type DatagridRowProps = React.ComponentPropsWithRef<typeof DatagridRow>;
type DatagridConfigurableProps = React.ComponentProps<typeof DatagridConfigurable>;

/** Specifies the row's accessible label: either a field name or a function. */
type RowLabel = ((record: RaRecord) => string) | string;

type AccessibleRowProps = DatagridRowProps & {
  rowIndex?: number;
  rowLabel?: RowLabel;
};

type AccessibleBodyProps = Omit<DatagridBodyProps, "row"> & {
  rowLabel?: RowLabel;
};

export type DatagridProps = DatagridConfigurableProps & {
  rowLabel?: RowLabel;
  empty?: ReactNode;
};

// ─────────────────────────────────────────────
// Cell title helpers
// ─────────────────────────────────────────────

type Translator = ReturnType<typeof useTranslate>;

/**
 * Converts a snake_case or camelCase source name to a readable Title Case label.
 * Used as the last-resort fallback when no i18n key exists for a field.
 * e.g. "unlabeled_field" → "Unlabeled Field", "mediaLength" → "Media Length"
 */
const humanizeSource = (source: string): string =>
  source
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

/**
 * Resolves a field's label prop to a plain string.
 * Falls back to the resource-scoped translation key, then a humanized source name.
 */
const resolveLabel = (label: unknown, source: string, resource: string | undefined, translate: Translator): string => {
  if (typeof label === "string") return translate(label, { _: label });
  if (resource) return translate(`resources.${resource}.fields.${source}`, { _: humanizeSource(source) });
  return humanizeSource(source);
};

/**
 * Converts a raw record value to a human-readable string for the title attribute.
 * Booleans use react-admin's standard translation keys (ra.boolean.true/false).
 */
const formatCellValue = (value: unknown, translate: Translator): string => {
  if (value == null) return "—";
  if (typeof value === "boolean") {
    return translate(value ? "ra.boolean.true" : "ra.boolean.false", { _: value ? "Yes" : "No" });
  }
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "—";
};

/**
 * Clones field children, injecting a `title="Column: Value"` onto each field
 * that has a `source` prop. Fields without source (icon buttons, etc.) are
 * passed through unchanged.
 *
 * RA's DatagridRow does NOT spread field props onto DatagridCell/TableCell, so
 * the title ends up on the field's own rendered element (e.g. a Typography span)
 * via sanitizeFieldRestProps. This provides hover tooltips on cell content rather
 * than on the <td> itself, still useful for column identification on hover.
 *
 * Field type dispatch (run in order, first match wins):
 *   1. DateField      : detected via child.type === DateField; formats the raw
 *      timestamp using new Date(v).toLocaleString(locales, options) mirroring
 *      what the field itself renders.
 *   2. ReferenceField : detected via typeof props.reference === "string".
 *      Uses child.type === ReferenceField instead would be cleaner, but that
 *      import triggers TS6133 ("declared but its value is never read") because
 *      TypeScript does not consider a runtime === comparison a value read.
 *      The same TS6133 constraint applies to FunctionField below.
 *   3. FunctionField  : detected via typeof props.render === "function".
 *      Calls render(record) and coerces the result to a string.
 *   4. Everything else: formatCellValue(record[source], translate).
 */
const injectCellTitles = (
  children: ReactNode,
  record: RaRecord,
  resource: string | undefined,
  translate: Translator
): ReactNode =>
  React.Children.map(children, child => {
    if (!React.isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const source = props.source as string | undefined;
    if (!source) return child;
    const label = resolveLabel(props.label, source, resource, translate);
    const rawValue = record[source];
    let value: string;
    if (child.type === DateField && (typeof rawValue === "number" || typeof rawValue === "string")) {
      try {
        value = new Date(rawValue as number | string).toLocaleString(
          props.locales as string | undefined,
          props.options as Intl.DateTimeFormatOptions | undefined
        );
      } catch {
        value = formatCellValue(rawValue, translate);
      }
    } else if (typeof props.reference === "string") {
      // ReferenceField: duck-typed by the `reference` prop (child.type === ReferenceField
      // triggers TS6133, the TypeScript compiler treats the import as unread).
      //
      // Strategy: read the first child element's `source` (e.g. "displayname") and
      // look it up on the OUTER record. Many Synapse API endpoints embed display
      // fields directly on the row record (e.g. room_members includes displayname),
      // so `record[childSource]` is often available without an async fetch.
      // Falls back to the raw reference ID (record[source]) when not present.
      //
      // Note: only the first child with a `source` prop is inspected, which covers
      // the common single-child pattern (<TextField source="displayname" />).
      const childSource = (() => {
        const kids = React.Children.toArray(props.children as ReactNode);
        for (const kid of kids) {
          if (React.isValidElement(kid)) {
            const kidProps = kid.props as Record<string, unknown>;
            if (typeof kidProps.source === "string") return kidProps.source;
          }
        }
        return undefined;
      })();
      value =
        childSource != null && record[childSource] != null
          ? formatCellValue(record[childSource], translate)
          : formatCellValue(rawValue, translate);
    } else if (typeof props.render === "function") {
      try {
        const rendered = (props.render as (r: RaRecord) => unknown)(record);
        if (typeof rendered === "string") value = rendered;
        else if (typeof rendered === "number") value = String(rendered);
        else value = formatCellValue(rawValue, translate);
      } catch {
        value = formatCellValue(rawValue, translate);
      }
    } else {
      value = formatCellValue(rawValue, translate);
    }
    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      title: `${label}: ${value}`,
    });
  }) ?? children;

// ─────────────────────────────────────────────
// AccessibleRow
// ─────────────────────────────────────────────

const focusSx = {
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: "-2px",
  },
} as const;

const AccessibleRow = React.forwardRef<HTMLTableRowElement, AccessibleRowProps>(
  ({ rowClick, rowIndex, rowLabel, sx: externalSx, ...props }, ref) => {
    const resource = useResourceContext(props);
    const record = useRecordContext(props);
    const getDefaultLabel = useGetRecordRepresentation(resource);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableRowElement>) => {
      // Guard: only handle events targeted directly on the row, not bubbled from inner interactive elements
      // (checkboxes, buttons in cells). Without this, Space on a focused child triggers both the child and the row.
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        (e.currentTarget as HTMLElement).click();
      }
    }, []);

    // Note: rowClick can be a function that dynamically returns false/void (no-op).
    // We cannot evaluate that statically, so those rows still get tabIndex/focus ring.
    // RA's own click handler guards against navigating to undefined, so behaviour is safe.
    const isClickable = rowClick != null && rowClick !== false;

    const mergedSx: SxProps | undefined = isClickable
      ? ((externalSx != null ? [externalSx, focusSx] : focusSx) as SxProps)
      : (externalSx as SxProps | undefined);

    const ariaLabel =
      isClickable && record
        ? typeof rowLabel === "function"
          ? rowLabel(record)
          : typeof rowLabel === "string"
            ? String((record as Record<string, unknown>)[rowLabel] ?? record.id)
            : String(getDefaultLabel(record))
        : undefined;

    return (
      <DatagridRow
        ref={ref}
        rowClick={rowClick}
        sx={mergedSx}
        {...(isClickable
          ? {
              tabIndex: 0,
              "aria-roledescription": "link",
              onKeyDown: handleKeyDown,
              "aria-rowindex": rowIndex,
              "aria-label": ariaLabel,
            }
          : {})}
        {...props}
      />
    );
  }
);

AccessibleRow.displayName = "AccessibleRow";

// ─────────────────────────────────────────────
// AccessibleBody
// ─────────────────────────────────────────────

const defaultData: RaRecord[] = [];
// Note: cloneElement onto a module-level constant is the same pattern react-admin uses
// internally in DatagridBody. If RA's DatagridBody rendering model changes across major
// versions, AccessibleBody will need to be updated accordingly.
const defaultRow = <AccessibleRow />;

const AccessibleBody = React.forwardRef<HTMLTableSectionElement, AccessibleBodyProps>(
  (
    {
      children,
      className,
      data = defaultData,
      expand,
      hasBulkActions = false,
      hover,
      onToggleItem,
      resource,
      rowClick,
      rowSx,
      rowStyle,
      selectedIds,
      isRowSelectable,
      rowLabel,
      ...rest
    },
    ref
  ) => {
    const listCtx = React.useContext(ListContext);
    const page = listCtx?.page ?? 1;
    const perPage = listCtx?.perPage ?? 10;
    const offset = (page - 1) * perPage;
    const translate = useTranslate();
    // resource prop may be undefined when DatagridConfigurable doesn't forward it;
    // fall back to the ResourceContext set by the parent List.
    const resolvedResource = useResourceContext({ resource });

    return (
      <TableBody
        ref={ref}
        className={["datagrid-body", className, DatagridClasses.tbody].filter(Boolean).join(" ")}
        {...rest}
      >
        {data.map((record, rowIndex) => (
          <RecordContextProvider value={record} key={record.id ?? `row${rowIndex}`}>
            {React.cloneElement(
              defaultRow,
              {
                className: [
                  DatagridClasses.row,
                  rowIndex % 2 === 0 ? DatagridClasses.rowEven : DatagridClasses.rowOdd,
                ].join(" "),
                expand,
                hasBulkActions: hasBulkActions && !!selectedIds,
                hover,
                id: record.id ?? (`row${rowIndex}` as Identifier),
                onToggleItem,
                resource,
                rowClick,
                // aria-rowindex is 1-based and must account for the header row (index 1),
                // so the first data row on page 1 is index 2.
                rowIndex: offset + rowIndex + 2,
                rowLabel,
                selectable: !isRowSelectable || isRowSelectable(record),
                selected: selectedIds?.includes(record.id),
                sx: rowSx?.(record, rowIndex),
                style: rowStyle?.(record, rowIndex),
              },
              injectCellTitles(children, record, resolvedResource, translate)
            )}
          </RecordContextProvider>
        ))}
      </TableBody>
    );
  }
);

// MUI Table requires this to accept the component as a valid child type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AccessibleBody as any).muiName = "TableBody";
AccessibleBody.displayName = "AccessibleBody";

// ─────────────────────────────────────────────
// Datagrid (public export)
// ─────────────────────────────────────────────

/**
 * Drop-in replacement for react-admin's DatagridConfigurable.
 * Adds keyboard navigation (Enter/Space), visible focus ring, aria-rowindex,
 * and aria-label to all clickable rows, and title="Column: Value" to all
 * data cells for screen reader context.
 * Defaults: empty=<EmptyState />, width 100%.
 */
const Datagrid = ({ rowLabel, empty = <EmptyState />, sx, ...props }: DatagridProps) => (
  <DatagridConfigurable
    body={<AccessibleBody rowLabel={rowLabel} />}
    empty={empty}
    sx={[{ width: "100%" }, sx as SxProps].filter(Boolean) as SxProps}
    {...props}
  />
);

export default Datagrid;

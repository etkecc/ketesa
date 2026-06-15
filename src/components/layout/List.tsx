import { cloneElement, isValidElement } from "react";
import { List as RaList, ListProps } from "react-admin";

import EmptyState from "./EmptyState";

/**
 * Thin wrapper around React-Admin's List that solves a structural limitation:
 *
 * React-Admin's ListView renders EITHER the toolbar (actions prop) OR the empty
 * component, never both. When a resource has no data, the entire toolbar including
 * custom action buttons (e.g. EventLookupButton on the Reports page) is hidden and
 * completely inaccessible to the user.
 *
 * This wrapper intercepts the `actions` and `empty` props, then injects `actions`
 * into the empty component via cloneElement so that EmptyState can render the same
 * toolbar buttons even when there is no data. Each resource List file only needs
 * to swap its List import to this component; props stay identical.
 */
const List = ({ actions, empty = <EmptyState />, ...rest }: ListProps) => {
  const emptyWithActions = isValidElement(empty)
    ? cloneElement(empty as React.ReactElement<{ actions?: React.ReactNode }>, { actions })
    : empty;
  return <RaList {...rest} actions={actions} empty={emptyWithActions} />;
};

export default List;

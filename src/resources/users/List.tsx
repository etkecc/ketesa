import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BlockIcon from "@mui/icons-material/Block";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import GetAppIcon from "@mui/icons-material/GetApp";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import LockIcon from "@mui/icons-material/Lock";
import NoAccountsIcon from "@mui/icons-material/NoAccounts";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Alert, Box, InputAdornment, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import {
  BooleanField,
  BooleanInput,
  Button,
  CreateButton,
  DateField,
  ExportButton,
  FilterButton,
  ListProps,
  NullableBooleanInput,
  Pagination,
  SelectInput,
  SimpleList,
  TextInput,
  TextField,
  TopToolbar,
  Identifier,
  useListContext,
  useLocale,
  useNotify,
  useTranslate,
  Link,
} from "react-admin";

import AvatarField from "../../components/users/fields/AvatarField";
import DeleteUserButton from "../../components/users/buttons/DeleteUserButton";
import { DeleteUserMediaBulkButton } from "../../components/users/buttons/DeleteAllMediaButton";
import { ServerNoticeBulkButton } from "../../components/users/ServerNotices";
import { FindUserButton } from "../../components/users/buttons/FindUserButton";
import { useDocTitle } from "../../components/hooks/useDocTitle";
import { GetConfig } from "../../utils/config";
import { DATE_FORMAT } from "../../utils/date";
import { isSystemUser, getLocalpart } from "../../utils/mxid";
import { isMAS } from "../../providers/data/mas";
import { Datagrid, EmptyState, List } from "../../components/layout";

// Security boundary: external-auth deployments must keep guests hidden (the guests input
// is also hidden in that mode). MAS forces guests=false at the provider, so it needs
// nothing here. Exported for direct unit coverage; collapsing this to {} exposes guest accounts.
export const userFilterDefaults = (): Record<string, unknown> => {
  if (isMAS()) return {};
  return GetConfig().externalAuthProvider ? { guests: false } : {};
};

const UserListActions = () => {
  const { total } = useListContext();
  return (
    <TopToolbar>
      <FilterButton />
      <FindUserButton />
      <CreateButton />
      {!!total && <ExportButton maxResults={10000} />}
      <Button component={Link} to="/import_users" label="CSV Import">
        <GetAppIcon sx={{ transform: "rotate(180deg)", fontSize: "20px" }} />
      </Button>
    </TopToolbar>
  );
};

const UserPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50, 100, 500, 1000]} />;

const SystemUsersFilter = (props: Record<string, unknown>) => {
  const translate = useTranslate();
  const label = (
    <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <HourglassEmptyIcon sx={{ fontSize: "1em", opacity: 0.6 }} />
      {translate("resources.users.fields.show_system_users")}
    </Box>
  );
  return (
    <NullableBooleanInput
      {...props}
      label={label}
      source="system_users"
      nullLabel="resources.users.fields.filter_user_all"
      falseLabel="resources.users.fields.filter_system_users_false"
      trueLabel="resources.users.fields.filter_system_users_true"
    />
  );
};

const MASStatusFilter = (props: Record<string, unknown>) => {
  return (
    <SelectInput
      {...props}
      source="status"
      choices={[
        { id: "active", name: "resources.mas_users.filter.status_active" },
        { id: "locked", name: "resources.mas_users.filter.status_locked" },
        { id: "deactivated", name: "resources.mas_users.filter.status_deactivated" },
      ]}
    />
  );
};

const ReverseSearchInput = (props: { source: string } & Record<string, unknown>) => {
  const translate = useTranslate();
  const nameValue = useWatch({ name: "name" }) as string | undefined;
  const isReverse = typeof nameValue === "string" && nameValue.startsWith("!");

  return (
    <TextInput
      {...props}
      resettable
      slotProps={{
        htmlInput: { "aria-label": translate("ra.action.search") },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              {isReverse ? (
                <HourglassEmptyIcon sx={{ fontSize: "1em", opacity: 0.6 }} />
              ) : (
                <SearchIcon sx={{ fontSize: "1em", opacity: 0.6 }} />
              )}
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

const userFilters = () => {
  const mas = isMAS();
  const filters = [
    <ReverseSearchInput key="name" source="name" alwaysOn />,
    ...(mas ? [<MASStatusFilter key="status" source="status" />, <BooleanInput key="admin" source="admin" />] : []),
    <NullableBooleanInput
      key="deactivated"
      label="resources.users.fields.show_deactivated"
      source="deactivated"
      nullLabel="resources.users.fields.filter_user_all"
      falseLabel="resources.users.fields.filter_deactivated_false"
      trueLabel="resources.users.fields.filter_deactivated_true"
    />,
    <NullableBooleanInput
      key="locked"
      label="resources.users.fields.show_locked"
      source="locked"
      nullLabel="resources.users.fields.filter_user_all"
      falseLabel="resources.users.fields.filter_locked_false"
      trueLabel="resources.users.fields.filter_locked_true"
    />,
    // waiting for https://github.com/element-hq/synapse/issues/18016
    // <BooleanInput label="resources.users.fields.show_suspended" source="suspended" alwaysOn />,
    // as of Synapse v1.149.1, filter doesn't work yet, showing all users instead of only shadow banned ones
    // <BooleanInput label="resources.users.fields.show_shadow_banned" source="shadow_banned" alwaysOn />,
  ];
  // guests filter: hidden in MAS mode (externalAuthProvider is set) and when using an external auth provider
  if (!GetConfig().externalAuthProvider) {
    filters.push(
      <NullableBooleanInput
        key="guests"
        label="resources.users.fields.show_guests"
        source="guests"
        nullLabel="resources.users.fields.filter_user_all"
        falseLabel="resources.users.fields.filter_guests_false"
        trueLabel="resources.users.fields.filter_guests_true"
      />
    );
  }
  if (GetConfig().asManagedUsers?.length > 0) {
    filters.push(<SystemUsersFilter key="system_users" source="system_users" />);
  }
  return filters;
};

export const UserPreventSelfDelete: React.FC<{
  children: React.ReactNode;
  ownUserIsSelected: boolean;
  systemUserIsSelected: boolean;
}> = props => {
  const ownUserIsSelected = props.ownUserIsSelected;
  const systemUserIsSelected = props.systemUserIsSelected;
  const notify = useNotify();
  const translate = useTranslate();

  const handleDeleteClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (ownUserIsSelected) {
      notify(<Alert severity="error">{translate("resources.users.helper.erase_admin_error")}</Alert>);
      ev.stopPropagation();
    } else if (systemUserIsSelected) {
      notify(<Alert severity="error">{translate("resources.users.helper.modify_managed_user_error")}</Alert>);
      ev.stopPropagation();
    }
  };

  return <div onClickCapture={handleDeleteClick}>{props.children}</div>;
};

const UserBulkActionButtons = () => {
  const record = useListContext();
  const [ownUserIsSelected, setOwnUserIsSelected] = useState(false);
  const [systemUserIsSelected, setSystemUserIsSelected] = useState(false);
  const selectedIds = record.selectedIds;
  const masIdMap = Object.fromEntries(
    (record.data || []).map(r => [String(r.id), r.mas_id ? String(r.mas_id) : undefined])
  ) as Record<string, string | undefined>;
  const ownUserId = localStorage.getItem("user_id");

  useEffect(() => {
    setOwnUserIsSelected(selectedIds.includes(ownUserId));
    setSystemUserIsSelected(selectedIds.some(id => isSystemUser(id)));
  }, [selectedIds, ownUserId]);

  return (
    <>
      <ServerNoticeBulkButton />
      <DeleteUserMediaBulkButton />
      <UserPreventSelfDelete ownUserIsSelected={ownUserIsSelected} systemUserIsSelected={systemUserIsSelected}>
        <DeleteUserButton
          selectedIds={selectedIds}
          confirmTitle="resources.users.helper.erase"
          confirmContent="resources.users.helper.erase_text"
          masIdMap={masIdMap}
        />
      </UserPreventSelfDelete>
    </>
  );
};

export const UserList = (props: ListProps) => {
  const locale = useLocale();
  const translate = useTranslate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  useDocTitle(translate("resources.users.name", { smart_count: 2 }));
  return (
    <List
      {...props}
      filters={userFilters()}
      filterDefaultValues={userFilterDefaults()}
      sort={{ field: "name", order: "ASC" }}
      actions={<UserListActions />}
      pagination={<UserPagination />}
      perPage={50}
      empty={<EmptyState />}
    >
      {isSmall ? (
        <SimpleList
          primaryText={record => (
            <Box component="span" sx={{ wordBreak: "break-all" }}>
              {record.displayname || getLocalpart(record.id)}
            </Box>
          )}
          secondaryText={record => (
            <Box component="span" sx={{ wordBreak: "break-all" }}>
              {record.id}
            </Box>
          )}
          tertiaryText={record => (
            <Box component="span" sx={{ display: "flex", gap: 0.5 }}>
              {record.admin && (
                <Tooltip title={translate("resources.users.fields.admin")}>
                  <AdminPanelSettingsIcon fontSize="small" color="primary" />
                </Tooltip>
              )}
              {record.locked && (
                <Tooltip title={translate("resources.users.fields.locked")}>
                  <LockIcon fontSize="small" color="warning" />
                </Tooltip>
              )}
              {record.suspended && (
                <Tooltip title={translate("resources.users.fields.suspended")}>
                  <BlockIcon fontSize="small" color="warning" />
                </Tooltip>
              )}
              {record.shadow_banned && (
                <Tooltip title={translate("resources.users.fields.shadow_banned")}>
                  <VisibilityOffIcon fontSize="small" color="warning" />
                </Tooltip>
              )}
              {record.deactivated && (
                <Tooltip title={translate("resources.users.fields.deactivated")}>
                  <NoAccountsIcon fontSize="small" color="error" />
                </Tooltip>
              )}
              {record.erased && (
                <Tooltip title={translate("resources.users.fields.erased")}>
                  <DeleteForeverIcon fontSize="small" color="error" />
                </Tooltip>
              )}
            </Box>
          )}
          rowClick="edit"
          leftIcon={record => (
            <AvatarField record={record} source="avatar_src" sx={{ height: "40px", width: "40px" }} />
          )}
        />
      ) : (
        <Datagrid
          rowLabel={record => String(record.displayname || record.id)}
          rowClick={(id: Identifier, resource: string) => `/${resource}/${encodeURIComponent(id)}`}
          bulkActionButtons={<UserBulkActionButtons />}
        >
          <AvatarField
            source="avatar_src"
            sx={{ height: "40px", width: "40px" }}
            sortBy="avatar_url"
            label="resources.users.fields.avatar"
          />
          <TextField
            source="id"
            sx={{
              wordBreak: "break-all",
            }}
            sortBy="name"
            label="resources.users.fields.id"
          />
          <TextField
            source="displayname"
            sx={{
              wordBreak: "break-all",
            }}
            label="resources.users.fields.displayname"
          />
          <BooleanField
            source="is_guest"
            label="resources.users.fields.is_guest"
            sortable={isMAS() ? false : undefined}
          />
          <BooleanField source="admin" label="resources.users.fields.admin" />
          <BooleanField source="deactivated" label="resources.users.fields.deactivated" />
          <BooleanField source="locked" label="resources.users.fields.locked" sortable={isMAS() ? false : undefined} />
          <BooleanField source="shadow_banned" label="resources.users.fields.shadow_banned" />
          <BooleanField source="erased" sortable={false} label="resources.users.fields.erased" />
          <DateField
            source="creation_ts_ms"
            label="resources.users.fields.creation_ts_ms"
            showTime
            options={DATE_FORMAT}
            locales={locale}
          />
        </Datagrid>
      )}
    </List>
  );
};

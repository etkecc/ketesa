import HttpsIcon from "@mui/icons-material/Https";
import NoEncryptionIcon from "@mui/icons-material/NoEncryption";
import StorageIcon from "@mui/icons-material/Storage";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonIcon from "@mui/icons-material/Person";
import Box from "@mui/material/Box";
import MuiList from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  BooleanField,
  WrapperField,
  ExportButton,
  FilterButton,
  FunctionField,
  ListProps,
  NullableBooleanInput,
  Pagination,
  ReferenceField,
  SearchInput,
  SelectColumnsButton,
  TextField as RaTextField,
  TopToolbar,
  useGetMany,
  useRecordContext,
  useTranslate,
  useListContext,
  useNotify,
  Button as RaButton,
  Confirm,
  Link,
  useDataProvider,
} from "react-admin";
import { RoomDirectoryBulkUnpublishButton, RoomDirectoryBulkPublishButton } from "../room-directory";
import AvatarField from "../../components/users/fields/AvatarField";
import {
  BlockRoomBulkButton,
  UnblockRoomBulkButton,
  BlockRoomByIdButton,
} from "../../components/users/buttons/BlockRoomButton";
import DeleteRoomButton from "../../components/users/buttons/DeleteRoomButton";
import { DeleteRoomMediaBulkButton } from "../../components/users/buttons/DeleteAllMediaButton";
import { useDocTitle } from "../../components/hooks/useDocTitle";
import { isMXID } from "../../utils/mxid";
import { Room } from "../../providers/types";
import { Datagrid, EmptyState, List } from "../../components/layout";

export const RoomPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50, 100, 500, 1000]} />;

export const MakeAdminBtn = () => {
  const record = useRecordContext() as Room;

  const ownMXID = localStorage.getItem("user_id") || "";
  const [open, setOpen] = useState(false);
  const [userIdValue, setUserIdValue] = useState(ownMXID);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const translate = useTranslate();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const result = await dataProvider.makeRoomAdmin(record.room_id, userIdValue);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      notify("resources.rooms.action.make_admin.success", { type: "success" });
      setOpen(false);
      setUserIdValue("");
    },
    onError: err => {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      notify("resources.rooms.action.make_admin.failure", { type: "error", messageArgs: { errMsg: errorMessage } });
      setOpen(false);
      setUserIdValue("");
    },
  });

  if (!record) {
    return null;
  }

  if (record.joined_local_members < 1) {
    return null;
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserIdValue(event.target.value);
  };

  const handleConfirm = async () => {
    if (!isMXID(userIdValue)) {
      notify("ketesa.auth.username_error", { type: "warning" });
      return;
    }
    mutate();
    setOpen(false);
  };

  const handleDialogClose = () => {
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <>
      <RaButton
        label="resources.rooms.action.make_admin.assign_admin"
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
        disabled={isPending}
      >
        <PersonIcon />
      </RaButton>
      <Confirm
        isOpen={open}
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
        confirm="resources.rooms.action.make_admin.confirm"
        cancel="ra.action.cancel"
        title={translate("resources.rooms.action.make_admin.title", {
          roomName: record.name ? record.name : record.room_id,
        })}
        content={
          <>
            <Typography sx={{ marginBottom: 2, whiteSpace: "pre-line" }}>
              {translate("resources.rooms.action.make_admin.content")}
            </Typography>
            <TextField
              type="text"
              variant="filled"
              value={userIdValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              label={translate("resources.users.fields.id")}
            />
          </>
        }
      />
    </>
  );
};

export const JoinUserBtn = () => {
  const record = useRecordContext() as Room;

  const [open, setOpen] = useState(false);
  const [userIdValue, setUserIdValue] = useState("");
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const translate = useTranslate();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const result = await dataProvider.joinUserToRoom(record.room_id, userIdValue);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      notify("resources.rooms.action.join.success", { type: "success" });
      setOpen(false);
      setUserIdValue("");
    },
    onError: err => {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      notify("resources.rooms.action.join.failure", { type: "error", messageArgs: { errMsg: errorMessage } });
      setOpen(false);
      setUserIdValue("");
    },
  });

  if (!record) {
    return null;
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserIdValue(event.target.value);
  };

  const handleConfirm = async () => {
    if (!isMXID(userIdValue)) {
      notify("ketesa.auth.username_error", { type: "warning" });
      return;
    }
    mutate();
    setOpen(false);
  };

  const handleDialogClose = () => {
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <>
      <RaButton
        label="resources.rooms.action.join.label"
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
        disabled={isPending}
      >
        <PersonAddIcon />
      </RaButton>
      <Confirm
        isOpen={open}
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
        confirm="resources.rooms.action.join.confirm"
        cancel="ra.action.cancel"
        title={translate("resources.rooms.action.join.title", {
          roomName: record.name ? record.name : record.room_id,
        })}
        content={
          <>
            <Typography sx={{ marginBottom: 2, whiteSpace: "pre-line" }}>
              {translate("resources.rooms.action.join.content")}
            </Typography>
            <TextField
              type="text"
              variant="filled"
              value={userIdValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              label={translate("resources.users.fields.id")}
            />
          </>
        }
      />
    </>
  );
};

export const RoomBulkActionButtons = () => {
  const record = useListContext();
  return (
    <>
      <BlockRoomBulkButton />
      <UnblockRoomBulkButton />
      <RoomDirectoryBulkPublishButton />
      <RoomDirectoryBulkUnpublishButton />
      <DeleteRoomMediaBulkButton />
      <DeleteRoomButton
        selectedIds={record.selectedIds}
        confirmTitle="resources.rooms.action.erase.title"
        confirmContent="resources.rooms.action.erase.content"
      />
    </>
  );
};

const RoomSearchInput = (_props: { alwaysOn?: boolean }) => {
  const translate = useTranslate();
  return (
    <SearchInput source="search_term" slotProps={{ htmlInput: { "aria-label": translate("ra.action.search") } }} />
  );
};

const roomFilters = [
  <RoomSearchInput key="search_term" alwaysOn />,
  <NullableBooleanInput key="public_rooms" source="public_rooms" label="resources.rooms.filter.public_rooms" />,
  <NullableBooleanInput key="empty_rooms" source="empty_rooms" label="resources.rooms.filter.empty_rooms" />,
];

const RoomListActions = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const { total } = useListContext();
  return (
    <TopToolbar>
      <RaButton component={Link} to="/database_room_statistics" label="resources.database_room_statistics.name">
        <StorageIcon />
      </RaButton>
      <FilterButton />
      <BlockRoomByIdButton />
      {!isSmall && !!total && <SelectColumnsButton />}
      {!!total && <ExportButton />}
    </TopToolbar>
  );
};

const RoomsMobileList = () => {
  const { data: rooms } = useListContext();
  const theme = useTheme();
  const translate = useTranslate();
  const ids = (rooms || []).map(r => r.id);
  const { data: roomDetails } = useGetMany("rooms", { ids }, { enabled: ids.length > 0 });
  const roomMap = new Map((roomDetails || []).map(r => [r.id, r]));

  if (!rooms?.length) return null;

  return (
    <MuiList disablePadding>
      {rooms.map(record => {
        const room = roomMap.get(record.id) || record;
        return (
          <ListItemButton
            key={record.id as string}
            component={Link}
            to={"/rooms/" + record.id + "/show"}
            sx={{ gap: 1, alignItems: "center" }}
          >
            <AvatarField record={room} source="avatar" sx={{ height: "40px", width: "40px" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ wordBreak: "break-all" }}>
                {record.name || record.canonical_alias || record.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {translate("resources.rooms.fields.joined_members")}: {record.joined_members ?? 0}
                {record.creator && (
                  <>
                    <br />
                    <Box component="span" sx={{ wordBreak: "break-all" }}>
                      {translate("resources.rooms.fields.creator")}: {record.creator}
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
              {record.is_encrypted ? (
                <Tooltip title={translate("resources.rooms.fields.encryption")}>
                  <HttpsIcon fontSize="small" sx={{ color: theme.palette.success.main }} />
                </Tooltip>
              ) : (
                <Tooltip title={translate("resources.rooms.fields.encryption")}>
                  <NoEncryptionIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
                </Tooltip>
              )}
            </Box>
          </ListItemButton>
        );
      })}
    </MuiList>
  );
};

export const RoomList = (props: ListProps) => {
  const theme = useTheme();
  const translate = useTranslate();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  useDocTitle(translate("resources.rooms.name", { smart_count: 2 }));

  return (
    <List
      {...props}
      pagination={<RoomPagination />}
      sort={{ field: "name", order: "ASC" }}
      filters={roomFilters}
      actions={<RoomListActions />}
      perPage={50}
      empty={<EmptyState />}
    >
      {isSmall ? (
        <RoomsMobileList />
      ) : (
        <Datagrid
          rowLabel={record => String(record.name || record.canonical_alias || record.id)}
          rowClick="show"
          bulkActionButtons={<RoomBulkActionButtons />}
          omit={["joined_local_members", "state_events", "version", "federatable", "join_rules"]}
        >
          <ReferenceField
            reference="rooms"
            source="id"
            label="resources.users.fields.avatar"
            link={false}
            sortable={false}
          >
            <AvatarField source="avatar" sx={{ height: "40px", width: "40px" }} />
          </ReferenceField>
          <RaTextField source="id" label="resources.rooms.fields.room_id" sortable={false} />
          <WrapperField source="encryption" sortBy="encryption" label="resources.rooms.fields.encryption">
            <BooleanField
              source="is_encrypted"
              sortBy="encryption"
              TrueIcon={HttpsIcon}
              FalseIcon={NoEncryptionIcon}
              label={<HttpsIcon />}
              sx={{
                [`& [data-testid="true"]`]: { color: theme.palette.success.main },
                [`& [data-testid="false"]`]: { color: theme.palette.error.main },
              }}
            />
          </WrapperField>
          <FunctionField
            source="name"
            sx={{
              wordBreak: "break-all",
            }}
            render={record => record["name"] || record["canonical_alias"] || record["id"]}
            label="resources.rooms.fields.name"
          />
          <RaTextField source="joined_members" label="resources.rooms.fields.joined_members" />
          <RaTextField source="joined_local_members" label="resources.rooms.fields.joined_local_members" />
          <RaTextField source="state_events" label="resources.rooms.fields.state_events" />
          <RaTextField source="version" label="resources.rooms.fields.version" />
          <RaTextField source="join_rules" label="resources.rooms.fields.join_rules" />
          <ReferenceField source="creator" reference="users">
            <RaTextField source="id" label="resources.rooms.fields.creator" sx={{ wordBreak: "break-all" }} />
          </ReferenceField>
          <BooleanField source="federatable" label="resources.rooms.fields.federatable" />
          <BooleanField source="public" label="resources.rooms.fields.public" />
          <WrapperField label="resources.rooms.fields.actions">
            <MakeAdminBtn />
          </WrapperField>
        </Datagrid>
      )}
    </List>
  );
};

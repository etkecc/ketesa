import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import HttpsIcon from "@mui/icons-material/Https";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import DevicesIcon from "@mui/icons-material/Devices";
import DocumentScannerIcon from "@mui/icons-material/DocumentScanner";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import LockClockIcon from "@mui/icons-material/LockClock";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PermMediaIcon from "@mui/icons-material/PermMedia";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import ScienceIcon from "@mui/icons-material/Science";
import SettingsInputComponentIcon from "@mui/icons-material/SettingsInputComponent";
import ViewListIcon from "@mui/icons-material/ViewList";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BlockIcon from "@mui/icons-material/Block";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import NoAccountsIcon from "@mui/icons-material/NoAccounts";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button as MuiButton,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  List as MuiList,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField as MuiTextField,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useMemo, useState } from "react";
import {
  ArrayInput,
  ArrayField,
  Button,
  BulkDeleteButton,
  DateField,
  DeleteButton,
  Edit,
  EditProps,
  Loading,
  TabbedForm,
  TabbedFormTabs,
  FormTab,
  BooleanField,
  BooleanInput,
  FunctionField,
  ListContextProvider,
  maxLength,
  Pagination,
  PasswordInput,
  ReferenceManyField,
  ReferenceField,
  regex,
  required,
  ResourceContextProvider,
  SaveButton,
  SelectInput,
  SimpleFormIterator,
  SimpleList,
  TextField,
  TextInput,
  Toolbar,
  ToolbarClasses,
  TopToolbar,
  WrapperField,
  useDataProvider,
  useGetList,
  useGetMany,
  useList,
  useLocale,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
  Link,
  Confirm,
  useListContext,
} from "react-admin";
import { useFormContext } from "react-hook-form";

import { MakeAdminBtn, RoomBulkActionButtons } from "../rooms";
import AvatarField from "../../components/users/fields/AvatarField";
import EditableAvatarField from "../../components/users/fields/EditableAvatarField";
import DeleteUserButton from "../../components/users/buttons/DeleteUserButton";
import { AllowCrossSigningButton } from "../../components/users/buttons/AllowCrossSigningButton";
import DeviceCreateButton from "../../components/users/buttons/DeviceCreateButton";
import { RenewAccountValidityButton } from "../../components/users/buttons/RenewAccountValidityButton";
import { useIsMAS } from "../../providers/data/mas";
import DeviceDisplayNameInput from "../../components/users/DeviceDisplayNameInput";
import DeviceRemoveButton, { DeviceBulkRemoveButton } from "../../components/users/buttons/DeviceRemoveButton";
import ExperimentalFeaturesList from "../../components/users/ExperimentalFeatures";
import { LoginAsUserButton } from "../../components/users/buttons/LoginAsUserButton";
import { ResetPasswordButton } from "../../components/users/buttons/ResetPasswordButton";
import { ServerNoticeButton } from "../../components/users/ServerNotices";
import UserAccountData from "../../components/users/UserAccountData";
import UserInfoChips from "../../components/users/UserCounts";
import UserRateLimits from "../../components/users/UserRateLimits";
import { useDocTitle } from "../../components/hooks/useDocTitle";
import { MediaIDField, ProtectMediaButton, QuarantineMediaButton } from "../../components/media";
import { QuarantineUserMediaButton } from "../../components/users/buttons/QuarantineAllMediaButton";
import { DeleteUserMediaButton } from "../../components/users/buttons/DeleteAllMediaButton";
import { SynapseDataProvider } from "../../providers/types";
import {
  FinishCompatSessionButton,
  FinishOAuth2SessionButton,
  RevokePersonalSessionButton,
  FinishUserSessionButton,
  DeleteOAuthLinkButton,
} from "../mas";
import { isMAS } from "../../providers/data/mas";
import { GetConfig } from "../../utils/config";
import { DATE_FORMAT } from "../../utils/date";
import { decodeURLComponent } from "../../utils/safety";
import { isSystemUser } from "../../utils/mxid";
import { formatBytes } from "../../utils/formatBytes";
import {
  evaluatePasswordStrength,
  generateRandomPassword,
  MIN_PASSWORD_SCORE,
  type PasswordStrength,
} from "../../utils/password";
import { UserPreventSelfDelete } from "./List";
import { Datagrid, EmptyState } from "../../components/layout";

// Shared constants — also used by Create.tsx
export const choices_medium = [
  { id: "email", name: "resources.users.email" },
  { id: "msisdn", name: "resources.users.msisdn" },
];

export const choices_type = [
  { id: "bot", name: "bot" },
  { id: "support", name: "support" },
];

// https://matrix.org/docs/spec/appendices#user-identifiers
// here only local part of user_id
// maxLength = 255 - "@" - ":" - storage.getItem("home_server").length
// storage.getItem("home_server").length is not valid here
export const validateUser = [required(), maxLength(253), regex(/^[a-z0-9._=\-+/]+$/, "ketesa.users.invalid_user_id")];

export const validateAddress = [required(), maxLength(255)];

// Set MAS password — used in the toolbar when in MAS mode
const MASSetPasswordButton = () => {
  const record = useRecordContext();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const notify = useNotify();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const translate = useTranslate();

  if (!record?.mas_id) return null;

  const handleConfirm = async () => {
    if (!password) return;
    setOpen(false);
    setLoading(true);
    try {
      const result = await dataProvider.masSetPassword(record.mas_id as string, password);
      if (result.success) {
        notify("resources.mas_users.action.set_password.success");
        setPassword("");
      } else {
        notify(result.error || "resources.mas_users.action.set_password.failure", { type: "error" });
      }
    } catch {
      notify("resources.mas_users.action.set_password.failure", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button label="resources.mas_users.action.set_password.label" onClick={() => setOpen(true)} disabled={loading}>
        <ManageAccountsIcon />
      </Button>
      <Confirm
        isOpen={open}
        title={translate("resources.mas_users.action.set_password.title")}
        content={
          <MuiTextField
            type={showPassword ? "text" : "password"}
            label={translate("resources.mas_users.action.set_password.label")}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            fullWidth
            autoFocus
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        }
        onConfirm={handleConfirm}
        onClose={() => {
          setOpen(false);
          setPassword("");
          setShowPassword(false);
        }}
      />
    </>
  );
};

// MAS sessions panel — sub-tabbed, shown in the Sessions tab of the user profile in MAS mode
const MASSessionsPanel = () => {
  const record = useRecordContext();
  const translate = useTranslate();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const notify = useNotify();
  const refresh = useRefresh();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const masId = record?.mas_id as string | undefined;
  const [tab, setTab] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form, setForm] = useState({ scope: "", human_name: "", expires_in: "" });

  const { data: personalSessions = [], isLoading: loadingPersonal } = useGetList(
    "mas_personal_sessions",
    { filter: { user_id: masId }, pagination: { page: 1, perPage: 50 }, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!masId }
  );
  const { data: userSessions = [], isLoading: loadingUser } = useGetList(
    "mas_user_sessions",
    { filter: { user_id: masId }, pagination: { page: 1, perPage: 50 }, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!masId }
  );
  const { data: oauth2Sessions = [], isLoading: loadingOAuth2 } = useGetList(
    "mas_oauth2_sessions",
    { filter: { user_id: masId }, pagination: { page: 1, perPage: 50 }, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!masId }
  );
  const { data: compatSessions = [], isLoading: loadingCompat } = useGetList(
    "mas_compat_sessions",
    { filter: { user_id: masId }, pagination: { page: 1, perPage: 50 }, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!masId }
  );

  // Build list contexts at top level (hooks must not be called conditionally)
  const personalListCtx = useList({ data: personalSessions, isLoading: loadingPersonal });
  const userListCtx = useList({ data: userSessions, isLoading: loadingUser });
  const oauth2ListCtx = useList({ data: oauth2Sessions, isLoading: loadingOAuth2 });
  const compatListCtx = useList({ data: compatSessions, isLoading: loadingCompat });

  const handleCreate = async () => {
    if (!masId || !form.scope || !form.human_name) return;
    setCreating(true);
    try {
      const result = await dataProvider.create("mas_personal_sessions", {
        data: {
          actor_user_id: masId,
          scope: form.scope,
          human_name: form.human_name,
          expires_in: form.expires_in ? Number(form.expires_in) : undefined,
        },
      });
      const token = result?.data?.access_token as string | undefined;
      if (token) setNewToken(token);
      setForm({ scope: "", human_name: "", expires_in: "" });
      refresh();
    } catch {
      notify("ra.notification.http_error", { type: "error" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label={translate("resources.mas_personal_sessions.name", { smart_count: 2 })} />
        <Tab label={translate("resources.mas_user_sessions.name", { smart_count: 2 })} />
        <Tab label={translate("resources.mas_oauth2_sessions.name", { smart_count: 2 })} />
        <Tab label={translate("resources.mas_compat_sessions.name", { smart_count: 2 })} />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "center", flexWrap: "wrap" }}>
            <MuiTextField
              size="small"
              label={translate("resources.mas_personal_sessions.fields.human_name")}
              value={form.human_name}
              onChange={e => setForm(f => ({ ...f, human_name: e.target.value }))}
            />
            <MuiTextField
              size="small"
              label={translate("resources.mas_personal_sessions.fields.scope")}
              value={form.scope}
              onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
            />
            <MuiTextField
              size="small"
              label={translate("resources.mas_personal_sessions.fields.expires_in")}
              value={form.expires_in}
              onChange={e => setForm(f => ({ ...f, expires_in: e.target.value }))}
              placeholder={translate("resources.mas_personal_sessions.helper.expires_in")}
              sx={{ minWidth: 220 }}
            />
            <MuiButton
              variant="contained"
              disabled={creating || !form.scope || !form.human_name}
              onClick={handleCreate}
              sx={{ height: "40px" }}
            >
              {translate("ra.action.create")}
            </MuiButton>
          </Box>
          <ResourceContextProvider value="mas_personal_sessions">
            <ListContextProvider value={personalListCtx}>
              {isSmall ? (
                <SimpleList
                  empty={<EmptyState resource="mas_personal_sessions" />}
                  primaryText={record => record.human_name || String(record.id)}
                  secondaryText={record => String(record.scope || "")}
                  tertiaryText={() => <RevokePersonalSessionButton />}
                  rowClick={false}
                  sx={{ "& .MuiListItemText-secondary": { wordBreak: "break-all" } }}
                />
              ) : (
                <Box sx={{ overflowX: "auto", mt: 2 }}>
                  <Datagrid
                    bulkActionButtons={false}
                    rowClick={false}
                    empty={<EmptyState resource="mas_personal_sessions" />}
                  >
                    <TextField source="human_name" sortable={false} emptyText="-" />
                    <TextField source="scope" sortable={false} />
                    <BooleanField source="active" sortable={false} />
                    <DateField source="created_at" showTime sortable={false} />
                    <DateField source="expires_at" showTime sortable={false} emptyText="-" />
                    <RevokePersonalSessionButton />
                  </Datagrid>
                </Box>
              )}
            </ListContextProvider>
          </ResourceContextProvider>
        </>
      )}
      {tab === 1 && (
        <ResourceContextProvider value="mas_user_sessions">
          <ListContextProvider value={userListCtx}>
            {isSmall ? (
              <SimpleList
                empty={<EmptyState resource="mas_user_sessions" />}
                primaryText={record => String(record.user_agent || record.last_active_ip || record.id)}
                secondaryText={record => String(record.last_active_ip || "")}
                tertiaryText={() => <FinishUserSessionButton />}
                rowClick={false}
              />
            ) : (
              <Box sx={{ overflowX: "auto", mt: 1 }}>
                <Datagrid
                  bulkActionButtons={false}
                  rowClick={false}
                  empty={<EmptyState resource="mas_user_sessions" />}
                >
                  <BooleanField source="active" sortable={false} />
                  <DateField source="created_at" showTime sortable={false} />
                  <DateField source="last_active_at" showTime sortable={false} emptyText="-" />
                  <TextField source="last_active_ip" sortable={false} emptyText="-" />
                  <TextField source="user_agent" sortable={false} emptyText="-" />
                  <FinishUserSessionButton />
                </Datagrid>
              </Box>
            )}
          </ListContextProvider>
        </ResourceContextProvider>
      )}
      {tab === 2 && (
        <ResourceContextProvider value="mas_oauth2_sessions">
          <ListContextProvider value={oauth2ListCtx}>
            {isSmall ? (
              <SimpleList
                empty={<EmptyState resource="mas_oauth2_sessions" />}
                primaryText={record => record.human_name || record.client_id || String(record.id)}
                secondaryText={record => String(record.scope || "")}
                tertiaryText={() => <FinishOAuth2SessionButton />}
                rowClick={false}
                sx={{ "& .MuiListItemText-secondary": { wordBreak: "break-all" } }}
              />
            ) : (
              <Box sx={{ overflowX: "auto", mt: 1 }}>
                <Datagrid
                  bulkActionButtons={false}
                  rowClick={false}
                  empty={<EmptyState resource="mas_oauth2_sessions" />}
                >
                  <TextField source="client_id" sortable={false} />
                  <FunctionField
                    source="scope"
                    label="resources.mas_oauth2_sessions.fields.scope"
                    sortable={false}
                    render={(record: { scope?: string }) =>
                      record?.scope ? (
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {record.scope
                            .split(" ")
                            .filter(Boolean)
                            .map(s => (
                              <Chip key={s} label={s} size="small" variant="outlined" sx={{ wordBreak: "break-all" }} />
                            ))}
                        </Box>
                      ) : null
                    }
                  />
                  <TextField source="human_name" sortable={false} emptyText="-" />
                  <BooleanField source="active" sortable={false} />
                  <DateField source="created_at" showTime sortable={false} />
                  <DateField source="last_active_at" showTime sortable={false} emptyText="-" />
                  <FinishOAuth2SessionButton />
                </Datagrid>
              </Box>
            )}
          </ListContextProvider>
        </ResourceContextProvider>
      )}
      {tab === 3 && (
        <ResourceContextProvider value="mas_compat_sessions">
          <ListContextProvider value={compatListCtx}>
            {isSmall ? (
              <SimpleList
                empty={<EmptyState resource="mas_compat_sessions" />}
                primaryText={record => record.human_name || record.device_id || String(record.id)}
                secondaryText={record => String(record.last_active_ip || "")}
                tertiaryText={() => <FinishCompatSessionButton />}
                rowClick={false}
              />
            ) : (
              <Box sx={{ overflowX: "auto", mt: 1 }}>
                <Datagrid
                  bulkActionButtons={false}
                  rowClick={false}
                  empty={<EmptyState resource="mas_compat_sessions" />}
                >
                  <TextField source="device_id" sortable={false} emptyText="-" />
                  <TextField source="human_name" sortable={false} emptyText="-" />
                  <BooleanField source="active" sortable={false} />
                  <DateField source="created_at" showTime sortable={false} />
                  <DateField source="last_active_at" showTime sortable={false} emptyText="-" />
                  <TextField source="last_active_ip" sortable={false} emptyText="-" />
                  <FinishCompatSessionButton />
                </Datagrid>
              </Box>
            )}
          </ListContextProvider>
        </ResourceContextProvider>
      )}

      <Dialog open={!!newToken} maxWidth="sm" fullWidth>
        <DialogTitle>{translate("resources.mas_personal_sessions.action.create.token_title")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {translate("resources.mas_personal_sessions.action.create.token_content")}
          </Typography>
          <MuiTextField
            value={newToken || ""}
            fullWidth
            multiline
            rows={3}
            slotProps={{ input: { readOnly: true } }}
            onClick={e => (e.target as HTMLInputElement).select()}
          />
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setNewToken(null)}>OK</MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// MAS upstream OAuth links panel — replaces the Synapse SSO tab in MAS mode
const MASUpstreamOAuthLinksPanel = () => {
  const record = useRecordContext();
  const translate = useTranslate();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const notify = useNotify();
  const refresh = useRefresh();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const masId = record?.mas_id as string | undefined;
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ provider_id: "", subject: "", human_account_name: "" });

  const { data: links = [], isLoading } = useGetList(
    "mas_upstream_oauth_links",
    { filter: { user_id: masId }, pagination: { page: 1, perPage: 50 }, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!masId }
  );
  const { data: providers = [] } = useGetList("mas_upstream_oauth_providers", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "human_name", order: "ASC" },
  });
  const linksListCtx = useList({ data: links, isLoading });

  const handleCreate = async () => {
    if (!masId || !form.provider_id || !form.subject) return;
    setCreating(true);
    try {
      await dataProvider.create("mas_upstream_oauth_links", {
        data: {
          user_id: masId,
          provider_id: form.provider_id,
          subject: form.subject,
          human_account_name: form.human_account_name || undefined,
        },
      });
      setForm({ provider_id: "", subject: "", human_account_name: "" });
      refresh();
    } catch {
      notify("ra.notification.http_error", { type: "error" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 1, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{translate("resources.mas_upstream_oauth_links.fields.provider_id")}</InputLabel>
          <Select
            value={form.provider_id}
            label={translate("resources.mas_upstream_oauth_links.fields.provider_id")}
            onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}
          >
            {providers.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.human_name || p.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <MuiTextField
          size="small"
          label={translate("resources.mas_upstream_oauth_links.fields.subject")}
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
        />
        <MuiTextField
          size="small"
          label={translate("resources.mas_upstream_oauth_links.fields.human_account_name")}
          value={form.human_account_name}
          onChange={e => setForm(f => ({ ...f, human_account_name: e.target.value }))}
        />
        <MuiButton
          variant="contained"
          disabled={creating || !form.provider_id || !form.subject}
          onClick={handleCreate}
          sx={{ height: "40px" }}
        >
          {translate("ra.action.create")}
        </MuiButton>
      </Box>
      <ResourceContextProvider value="mas_upstream_oauth_links">
        <ListContextProvider value={linksListCtx}>
          {isSmall ? (
            <SimpleList
              empty={<EmptyState resource="mas_upstream_oauth_links" />}
              primaryText={record => String(record.subject || "")}
              secondaryText={record => String(record.provider_id || "")}
              tertiaryText={() => <DeleteOAuthLinkButton />}
              rowClick={false}
            />
          ) : (
            <Datagrid
              bulkActionButtons={false}
              rowClick={false}
              empty={<EmptyState resource="mas_upstream_oauth_links" />}
              sx={{ width: "100%" }}
            >
              <TextField source="provider_id" sortable={false} />
              <TextField source="subject" sortable={false} />
              <TextField source="human_account_name" sortable={false} emptyText="-" />
              <DateField source="created_at" showTime sortable={false} />
              <DeleteOAuthLinkButton />
            </Datagrid>
          )}
        </ListContextProvider>
      </ResourceContextProvider>
    </Box>
  );
};

// MAS email management panel — replaces the Synapse 3PIDs tab in MAS mode
const MASEmailsPanel = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const translate = useTranslate();
  const locale = useLocale();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const masId = record?.mas_id as string | undefined;

  const {
    data: emails,
    isLoading,
    refetch,
  } = useGetList(
    "mas_user_emails",
    { filter: { user_id: masId }, pagination: { page: 1, perPage: 50 }, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!masId }
  );

  const handleDelete = async (emailId: string) => {
    try {
      await dataProvider.delete("mas_user_emails", { id: emailId, previousData: { id: emailId } });
      notify("resources.mas_user_emails.action.remove.success");
      refetch();
    } catch {
      notify("ra.notification.http_error", { type: "error" });
    }
  };

  const handleAdd = async () => {
    if (!newEmail || !masId) return;
    setAdding(true);
    try {
      await dataProvider.create("mas_user_emails", { data: { user_id: masId, email: newEmail } });
      notify("resources.mas_user_emails.action.create.success");
      setNewEmail("");
      refetch();
    } catch {
      notify("ra.notification.http_error", { type: "error" });
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Box sx={{ width: "100%" }}>
      {isSmall ? (
        <MuiList disablePadding>
          {(emails || []).map(email => (
            <ListItem
              key={String(email.id)}
              secondaryAction={
                <Button
                  label="resources.mas_user_emails.action.remove.label"
                  onClick={() => handleDelete(String(email.id))}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </Button>
              }
            >
              <ListItemText
                primary={String(email.email)}
                secondary={new Date(String(email.created_at)).toLocaleString(locale, DATE_FORMAT)}
              />
            </ListItem>
          ))}
        </MuiList>
      ) : (
        <Datagrid
          data={emails || []}
          total={emails?.length || 0}
          isLoading={isLoading}
          bulkActionButtons={false}
          rowClick={false}
          empty={<EmptyState resource="mas_user_emails" />}
          sx={{ width: "100%", mb: 2 }}
        >
          <TextField source="email" sortable={false} />
          <DateField source="created_at" showTime sortable={false} />
          <WrapperField label="resources.mas_user_emails.fields.actions">
            <FunctionField
              render={(emailRecord: { id: string }) => (
                <Button
                  label="resources.mas_user_emails.action.remove.label"
                  onClick={() => handleDelete(emailRecord.id)}
                  color="error"
                >
                  <DeleteIcon />
                </Button>
              )}
            />
          </WrapperField>
        </Datagrid>
      )}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <MuiTextField
          label={translate("resources.mas_user_emails.fields.email")}
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          size="small"
        />
        <Button
          label="ra.action.add"
          onClick={handleAdd}
          disabled={adding || !newEmail}
          variant="contained"
          sx={{ height: "40px" }}
        />
      </Box>
    </Box>
  );
};

const UserEditActions = () => {
  const record = useRecordContext();
  const isMAS = useIsMAS();
  const ownUserId = localStorage.getItem("user_id");
  let ownUserIsSelected = false;
  let systemUserIsSelected = false;
  if (record && record.id) {
    ownUserIsSelected = record.id === ownUserId;
    systemUserIsSelected = isSystemUser(record.id);
  }

  return (
    <TopToolbar sx={{ flexWrap: "wrap", gap: 0.5, whiteSpace: "normal" }}>
      {!record?.deactivated && !isMAS && <LoginAsUserButton />}
      {!record?.deactivated && !isMAS && <ResetPasswordButton />}
      {!record?.deactivated && isMAS && <MASSetPasswordButton />}
      {!record?.deactivated && !isMAS && <AllowCrossSigningButton />}
      {!record?.deactivated && !isMAS && <RenewAccountValidityButton />}
      {!record?.deactivated && <ServerNoticeButton />}
      {record && record.id && (
        <UserPreventSelfDelete ownUserIsSelected={ownUserIsSelected} systemUserIsSelected={systemUserIsSelected}>
          <DeleteUserButton
            selectedIds={[record?.id]}
            confirmTitle="resources.users.helper.erase"
            confirmContent="resources.users.helper.erase_text"
            masIdMap={record?.mas_id ? { [String(record.id)]: String(record.mas_id) } : undefined}
          />
        </UserPreventSelfDelete>
      )}
    </TopToolbar>
  );
};

const UserTitle = () => {
  const record = useRecordContext();
  const translate = useTranslate();
  const baseTitle = translate("resources.users.name", { smart_count: 1 });

  const username = record ? (record.displayname ? `${record.displayname} (${record.name})` : `${record.name}`) : "";
  const pageTitle = record ? `${baseTitle} ${username}` : baseTitle;
  useDocTitle(pageTitle);
  if (!record) {
    return null;
  }
  return (
    <span>
      {baseTitle} <AvatarField source="avatar_src" sx={{ height: "25px", width: "25px" }} /> {username}
    </span>
  );
};

const UserEditToolbar = () => {
  const record = useRecordContext();
  const ownUserId = localStorage.getItem("user_id");
  let ownUserIsSelected = false;
  let systemUserIsSelected = false;
  if (record && record.id) {
    ownUserIsSelected = record.id === ownUserId;
    systemUserIsSelected = isSystemUser(record.id);
  }

  return (
    <>
      <div className={ToolbarClasses.defaultToolbar}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <SaveButton />
          {record && record.id && (
            <UserPreventSelfDelete ownUserIsSelected={ownUserIsSelected} systemUserIsSelected={systemUserIsSelected}>
              <DeleteUserButton
                selectedIds={[record.id]}
                confirmTitle="resources.users.helper.erase"
                confirmContent="resources.users.helper.erase_text"
                masIdMap={record?.mas_id ? { [String(record.id)]: String(record.mas_id) } : undefined}
              />
            </UserPreventSelfDelete>
          )}
        </Toolbar>
      </div>
    </>
  );
};

export const UserBooleanInput = (props: React.ComponentProps<typeof BooleanInput> & { icon?: React.ReactNode }) => {
  const translate = useTranslate();
  const record = useRecordContext();
  const ownUserId = localStorage.getItem("user_id");
  let ownUserIsSelected = false;
  let systemUserIsSelected = false;
  if (record) {
    ownUserIsSelected = record.id === ownUserId;
    systemUserIsSelected = isSystemUser(record.id);
    if (["locked", "deactivated", "erased"].includes(props.source) && record[props.source]) {
      // we want to allow re-activating locked/deactivated/erased users even if they are AS managed
      systemUserIsSelected = false;
    }
  }

  const { icon, ...rest } = props;
  const label = icon ? (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      {icon}
      {translate((typeof rest.label === "string" && rest.label) || `resources.users.fields.${rest.source}`)}
    </Box>
  ) : undefined;

  return (
    <UserPreventSelfDelete ownUserIsSelected={ownUserIsSelected} systemUserIsSelected={systemUserIsSelected}>
      <BooleanInput disabled={ownUserIsSelected || systemUserIsSelected} {...rest} {...(label ? { label } : {})} />
    </UserPreventSelfDelete>
  );
};

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
const STRENGTH_COLORS = ["error", "error", "warning", "success", "success"] as const;

const PasswordStrengthMeter = ({ strength }: { strength: PasswordStrength }) => {
  const { score, warning, suggestions } = strength;
  const feedback = warning || suggestions[0] || "";
  return (
    <Box sx={{ mt: -0.5, mb: 1 }}>
      <LinearProgress
        variant="determinate"
        value={((score + 1) / 5) * 100}
        color={STRENGTH_COLORS[score]}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {STRENGTH_LABELS[score]}
        {feedback && ` — ${feedback}`}
      </Typography>
    </Box>
  );
};

export const UserPasswordInput = (props: React.ComponentProps<typeof PasswordInput>) => {
  const record = useRecordContext();
  let systemUserIsSelected = false;
  const translate = useTranslate();

  // Get form context to update field value
  const form = useFormContext();
  if (record) {
    systemUserIsSelected = isSystemUser(record.id);
  }

  const generatePassword = () => {
    const password = generateRandomPassword();
    form.setValue("password", password, { shouldDirty: true, shouldValidate: true });
  };

  // Get the current deactivated state and the original value
  const deactivated = form.watch("deactivated");
  const deactivatedFromRecord = record?.deactivated;

  // When the homeserver delegates to MAS, MAS enforces zxcvbn-based password
  // complexity server-side and rejects weak passwords with HTTP 400. Mirror
  // that check on the client so the form blocks submission and shows feedback
  // instead of failing after the round-trip.
  const useMAS = !!GetConfig().externalAuthProvider;
  const passwordValue = form.watch(props.source ?? "password");
  const strength = useMemo(
    () =>
      useMAS && typeof passwordValue === "string" && passwordValue.length > 0
        ? evaluatePasswordStrength(passwordValue)
        : null,
    [useMAS, passwordValue]
  );

  const validatePassword = (value: unknown) => {
    // Reactivation case: in Synapse-only mode, password is required.
    if (deactivatedFromRecord === true && deactivated === false && !useMAS && !value) {
      return translate("resources.users.helper.password_required_for_reactivation");
    }
    // MAS complexity gate.
    if (useMAS && typeof value === "string" && value.length > 0) {
      const result = evaluatePasswordStrength(value);
      if (result.score < MIN_PASSWORD_SCORE) {
        return result.warning || result.suggestions[0] || "Password is too weak";
      }
    }
    return undefined;
  };

  let passwordHelperText = "resources.users.helper.create_password";

  if (systemUserIsSelected) {
    passwordHelperText = "resources.users.helper.modify_managed_user_error";
  } else if (deactivatedFromRecord === true && deactivated === false && !useMAS) {
    passwordHelperText = "resources.users.helper.password_required_for_reactivation";
  } else if (record) {
    passwordHelperText = "resources.users.helper.password";
  }

  return (
    <>
      <PasswordInput
        {...props}
        validate={validatePassword}
        helperText={passwordHelperText}
        disabled={systemUserIsSelected}
      />
      {strength && <PasswordStrengthMeter strength={strength} />}
      <Button
        variant="outlined"
        label="resources.users.action.generate_password"
        onClick={generatePassword}
        sx={{ marginBottom: "10px" }}
        disabled={systemUserIsSelected}
      />
    </>
  );
};

const ErasedBooleanInput = (props: React.ComponentProps<typeof BooleanInput>) => {
  const record = useRecordContext();
  const form = useFormContext();
  const deactivated = form.watch("deactivated");
  const erased = form.watch("erased");

  const erasedFromRecord = record?.erased;
  const deactivatedFromRecord = record?.deactivated;

  useEffect(() => {
    // If the user was erased and deactivated, by unchecking Erased, we want to also uncheck Deactivated
    if (erasedFromRecord === true && erased === false) {
      form.setValue("deactivated", false);
    }
  }, [deactivatedFromRecord, erased, erasedFromRecord, form]);

  return <UserBooleanInput disabled={!deactivated} {...props} />;
};

const JoinedRoomsMobileList = () => {
  const { data: joinedRooms } = useListContext();
  const translate = useTranslate();
  const ids = (joinedRooms || []).map(r => r.id);
  const { data: rooms } = useGetMany("rooms", { ids }, { enabled: ids.length > 0 });
  const roomMap = new Map((rooms || []).map(r => [r.id, r]));

  if (!joinedRooms) return null;
  if (!joinedRooms.length) return <EmptyState resource="joined_rooms" />;

  return (
    <MuiList disablePadding>
      {joinedRooms.map(record => {
        const room = roomMap.get(record.id);
        return (
          <ListItemButton
            key={record.id as string}
            component={Link}
            to={"/rooms/" + record.id + "/show"}
            sx={{ gap: 1, alignItems: "center" }}
          >
            <AvatarField record={room || record} source="avatar" sx={{ height: "40px", width: "40px" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ wordBreak: "break-all" }}>
                {room?.name || room?.canonical_alias || record.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {translate("resources.rooms.fields.joined_members")}: {room?.joined_members ?? 0}
                {room?.creator && (
                  <>
                    <br />
                    <Box component="span" sx={{ wordBreak: "break-all" }}>
                      {translate("resources.rooms.fields.creator")}: {room.creator}
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
          </ListItemButton>
        );
      })}
    </MuiList>
  );
};

const MembershipsMobileList = () => {
  const { data: memberships } = useListContext();
  const translate = useTranslate();
  const ids = (memberships || []).map(r => r.id);
  const { data: rooms } = useGetMany("rooms", { ids }, { enabled: ids.length > 0 });
  const roomMap = new Map((rooms || []).map(r => [r.id, r]));

  if (!memberships) return null;
  if (!memberships.length) return <EmptyState resource="memberships" />;

  return (
    <MuiList disablePadding>
      {memberships.map(record => {
        const room = roomMap.get(record.id);
        return (
          <ListItemButton
            key={record.id as string}
            component={Link}
            to={"/rooms/" + record.id + "/show"}
            sx={{ gap: 1, alignItems: "center" }}
          >
            <AvatarField record={room || record} source="avatar" sx={{ height: "40px", width: "40px" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ wordBreak: "break-all" }}>
                {room?.name || record.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {translate("resources.users.membership", { smart_count: 1 })}: {record.membership}
              </Typography>
            </Box>
          </ListItemButton>
        );
      })}
    </MuiList>
  );
};

const UserPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50, 100, 500, 1000]} />;

export const UserEdit = (props: EditProps) => {
  const translate = useTranslate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const locale = useLocale();

  return (
    <Edit
      {...props}
      title={<UserTitle />}
      actions={<UserEditActions />}
      mutationMode="pessimistic"
      queryOptions={{
        meta: {
          include: ["features"], // Tell your dataProvider to include features
        },
      }}
      sx={{ "& .RaEdit-card": { maxWidth: { xs: "100vw", sm: "calc(100vw - 32px)" }, minWidth: 0, overflowX: "auto" } }}
    >
      <TabbedForm
        toolbar={<UserEditToolbar />}
        tabs={<TabbedFormTabs variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile />}
      >
        <FormTab label={translate("resources.users.name", { smart_count: 1 })} icon={<PersonPinIcon />}>
          {!isMAS() && (
            <Box
              sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 4, width: "100%", mb: 2, mt: 1 }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 140,
                  gap: 2,
                }}
              >
                <EditableAvatarField source="avatar_src" />
                <UserInfoChips />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextInput source="id" readOnly fullWidth />
                <TextInput source="displayname" fullWidth />
                <SelectInput source="user_type" choices={choices_type} translateChoice={false} resettable fullWidth />
                <UserPasswordInput
                  source="password"
                  autoComplete="new-password"
                  helperText="resources.users.helper.password"
                />
              </Box>
            </Box>
          )}

          {isMAS() && (
            <Box
              sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 4, width: "100%", mb: 2, mt: 1 }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 140,
                  gap: 2,
                }}
              >
                <EditableAvatarField source="avatar_src" />
                <UserInfoChips />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextInput source="id" readOnly fullWidth label="resources.users.fields.id" />
                <TextInput source="mas_id" readOnly fullWidth label="resources.mas_users.fields.id" />
                <TextInput source="displayname" fullWidth />
                <SelectInput source="user_type" choices={choices_type} translateChoice={false} resettable fullWidth />
              </Box>
            </Box>
          )}

          <Divider sx={{ width: "100%", my: 2 }} />

          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 4, width: "100%" }}>
            {!isMAS() && (
              <Box sx={{ flex: 1 }}>
                <UserBooleanInput
                  source="suspended"
                  helperText="resources.users.helper.suspend"
                  icon={<BlockIcon fontSize="small" />}
                />
                <UserBooleanInput
                  source="shadow_banned"
                  helperText="resources.users.helper.shadow_ban"
                  icon={<VisibilityOffIcon fontSize="small" />}
                />
                <UserBooleanInput
                  sx={{ color: theme.palette.warning.main }}
                  source="locked"
                  helperText="resources.users.helper.lock"
                  icon={<LockIcon fontSize="small" />}
                />
              </Box>
            )}
            {isMAS() && (
              <Box sx={{ flex: 1 }}>
                <UserBooleanInput
                  sx={{ color: theme.palette.warning.main }}
                  source="locked"
                  helperText="resources.users.helper.lock"
                  icon={<LockIcon fontSize="small" />}
                />
                <UserBooleanInput
                  source="suspended"
                  helperText="resources.users.helper.suspend"
                  icon={<BlockIcon fontSize="small" />}
                />
                <UserBooleanInput
                  source="shadow_banned"
                  helperText="resources.users.helper.shadow_ban"
                  icon={<VisibilityOffIcon fontSize="small" />}
                />
              </Box>
            )}
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 2,
                borderColor: theme.palette.error.main,
                borderStyle: "dashed",
              }}
            >
              <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                {translate("ketesa.users.danger_zone")}
              </Typography>
              <UserBooleanInput
                source="admin"
                helperText="resources.users.helper.admin"
                icon={<AdminPanelSettingsIcon fontSize="small" />}
              />
              <UserBooleanInput
                sx={{ color: theme.palette.error.main }}
                source="deactivated"
                helperText="resources.users.helper.deactivate"
                icon={<NoAccountsIcon fontSize="small" />}
              />
              {!isMAS() && (
                <ErasedBooleanInput
                  sx={{ color: theme.palette.error.main, marginLeft: "25px" }}
                  source="erased"
                  helperText="resources.users.helper.erase"
                  icon={<DeleteForeverIcon fontSize="small" />}
                />
              )}
            </Paper>
          </Box>

          {isMAS() && (
            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
              <FunctionField
                render={(r: { locked_at?: string }) =>
                  r?.locked_at ? (
                    <Chip
                      size="small"
                      label={`${translate("resources.mas_users.fields.locked_at")}: ${new Date(r.locked_at).toLocaleString(locale, DATE_FORMAT)}`}
                    />
                  ) : null
                }
              />
              <FunctionField
                render={(r: { deactivated_at?: string }) =>
                  r?.deactivated_at ? (
                    <Chip
                      size="small"
                      label={`${translate("resources.mas_users.fields.deactivated_at")}: ${new Date(r.deactivated_at).toLocaleString(locale, DATE_FORMAT)}`}
                    />
                  ) : null
                }
              />
            </Box>
          )}
        </FormTab>

        <FormTab label="resources.users.threepid" icon={<ContactMailIcon />} path="threepid">
          {isMAS() ? (
            <MASEmailsPanel />
          ) : (
            <ArrayInput source="threepids">
              <SimpleFormIterator disableReordering>
                <SelectInput source="medium" choices={choices_medium} />
                <TextInput source="address" />
              </SimpleFormIterator>
            </ArrayInput>
          )}
        </FormTab>

        <FormTab label="ketesa.users.tabs.sso" icon={<AssignmentIndIcon />} path="sso">
          {isMAS() ? (
            <MASUpstreamOAuthLinksPanel />
          ) : (
            <ArrayInput source="external_ids" label="">
              <SimpleFormIterator disableReordering>
                <TextInput source="auth_provider" validate={required()} />
                <TextInput source="external_id" label="resources.users.fields.id" validate={required()} />
              </SimpleFormIterator>
            </ArrayInput>
          )}
        </FormTab>

        {isMAS() && (
          <FormTab label="ketesa.users.tabs.sessions" icon={<HttpsIcon />} path="sessions">
            <MASSessionsPanel />
          </FormTab>
        )}

        <FormTab label={translate("resources.devices.name", { smart_count: 2 })} icon={<DevicesIcon />} path="devices">
          <DeviceCreateButton />
          <ReferenceManyField
            reference="devices"
            target="user_id"
            label=""
            pagination={<UserPagination />}
            perPage={10}
          >
            <Box sx={{ width: "100%" }}>
              {isSmall ? (
                <SimpleList
                  empty={<EmptyState resource="devices" />}
                  primaryText={record => (
                    <Box component="span" sx={{ wordBreak: "break-all" }}>
                      {record.device_id}
                    </Box>
                  )}
                  secondaryText={record => (
                    <>
                      {record.display_name && (
                        <>
                          {record.display_name}
                          <br />
                        </>
                      )}
                      {record.last_seen_ip && (
                        <>
                          {record.last_seen_ip}
                          <br />
                        </>
                      )}
                      {record.last_seen_ts && new Date(record.last_seen_ts).toLocaleString(locale)}
                    </>
                  )}
                  tertiaryText={() => <DeviceRemoveButton />}
                  rowClick={false}
                />
              ) : (
                <Datagrid
                  bulkActionButtons={<DeviceBulkRemoveButton />}
                  omit={["last_seen_user_agent", "dehydrated"]}
                  empty={<EmptyState resource="devices" />}
                >
                  <TextField source="device_id" sortable={false} />
                  <DeviceDisplayNameInput />
                  <TextField source="last_seen_ip" sortable={false} />
                  <TextField source="last_seen_user_agent" sortable={false} />
                  <DateField source="last_seen_ts" showTime options={DATE_FORMAT} sortable={false} locales={locale} />
                  <BooleanField source="dehydrated" sortable={false} />
                  <WrapperField label="resources.rooms.fields.actions">
                    <DeviceRemoveButton />
                  </WrapperField>
                </Datagrid>
              )}
            </Box>
          </ReferenceManyField>
        </FormTab>

        <FormTab label="resources.connections.name" icon={<SettingsInputComponentIcon />} path="connections">
          <ReferenceField reference="connections" source="id" label="" link={false}>
            <WrapperField label="resources.connections.name">
              <ArrayField source="devices[].sessions[0].connections">
                {isSmall ? (
                  <SimpleList
                    empty={<EmptyState resource="connections" />}
                    primaryText={record => record.ip}
                    secondaryText={record => (
                      <>
                        {record.last_seen && new Date(record.last_seen).toLocaleString(locale)}
                        {record.user_agent && (
                          <>
                            <br />
                            <Box component="span" sx={{ wordBreak: "break-all" }}>
                              {record.user_agent}
                            </Box>
                          </>
                        )}
                      </>
                    )}
                    rowClick={false}
                  />
                ) : (
                  <Datagrid
                    sx={{ width: "100%" }}
                    bulkActionButtons={false}
                    empty={<EmptyState resource="connections" />}
                  >
                    <TextField source="ip" sortable={false} />
                    <DateField source="last_seen" showTime options={DATE_FORMAT} sortable={false} locales={locale} />
                    <TextField source="user_agent" sortable={false} style={{ width: "100%" }} />
                  </Datagrid>
                )}
              </ArrayField>
            </WrapperField>
          </ReferenceField>
        </FormTab>

        <FormTab
          label={translate("resources.users_media.name", { smart_count: 2 })}
          icon={<PermMediaIcon />}
          path="media"
        >
          <QuarantineUserMediaButton />
          <DeleteUserMediaButton />
          <ReferenceManyField
            reference="users_media"
            target="user_id"
            label=""
            pagination={<UserPagination />}
            perPage={10}
            sort={{ field: "created_ts", order: "DESC" }}
          >
            {isSmall ? (
              <SimpleList
                empty={<EmptyState resource="users_media" />}
                primaryText={record => (
                  <Box component="span" sx={{ wordBreak: "break-all" }}>
                    {record.upload_name ? decodeURLComponent(record.upload_name) : record.media_id}
                  </Box>
                )}
                secondaryText={record => (
                  <>
                    {formatBytes(record.media_length)}
                    {record.media_type && <> · {record.media_type}</>}
                    <br />
                    {new Date(record.created_ts).toLocaleString(locale)}
                  </>
                )}
                tertiaryText={() => (
                  <Box component="span" sx={{ display: "flex", gap: 0.5 }}>
                    <QuarantineMediaButton />
                    <ProtectMediaButton />
                    <DeleteButton mutationMode="pessimistic" redirect={false} />
                  </Box>
                )}
                rowClick={false}
              />
            ) : (
              <Datagrid
                sx={{ width: "100%" }}
                bulkActionButtons={<BulkDeleteButton />}
                empty={<EmptyState resource="users_media" />}
              >
                <MediaIDField source="media_id" />
                <DateField source="created_ts" showTime options={DATE_FORMAT} locales={locale} />
                <DateField source="last_access_ts" showTime options={DATE_FORMAT} locales={locale} />
                <FunctionField source="media_length" render={record => formatBytes(record.media_length)} />
                <TextField source="media_type" sx={{ display: "block", width: 200, wordBreak: "break-word" }} />
                <FunctionField
                  source="upload_name"
                  render={record => (record.upload_name ? decodeURLComponent(record.upload_name) : "")}
                />
                <TextField source="quarantined_by" />
                <QuarantineMediaButton />
                <ProtectMediaButton />
                <DeleteButton mutationMode="pessimistic" redirect={false} />
              </Datagrid>
            )}
          </ReferenceManyField>
        </FormTab>

        <FormTab label={translate("resources.rooms.name", { smart_count: 2 })} icon={<ViewListIcon />} path="rooms">
          <ReferenceManyField
            reference="joined_rooms"
            target="user_id"
            label=""
            perPage={10}
            pagination={<Pagination />}
          >
            {isSmall ? (
              <JoinedRoomsMobileList />
            ) : (
              <Datagrid
                sx={{ width: "100%" }}
                rowClick={id => "/rooms/" + id + "/show"}
                bulkActionButtons={<RoomBulkActionButtons />}
                empty={<EmptyState resource="joined_rooms" />}
              >
                <ReferenceField reference="rooms" source="id" label="" link={false} sortable={false}>
                  <AvatarField source="avatar" sx={{ height: "40px", width: "40px" }} />
                </ReferenceField>
                <TextField
                  source="id"
                  label="resources.rooms.fields.room_id"
                  sortable={false}
                  sx={{ wordBreak: "break-all" }}
                />
                <ReferenceField
                  reference="rooms"
                  source="id"
                  label="resources.rooms.fields.name"
                  link={false}
                  sortable={false}
                >
                  <TextField
                    source="name"
                    sx={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  />
                </ReferenceField>
                <ReferenceField
                  reference="rooms"
                  source="id"
                  label="resources.rooms.fields.joined_members"
                  link={false}
                  sortable={false}
                >
                  <TextField source="joined_members" sortable={false} />
                </ReferenceField>
                <ReferenceField reference="rooms" source="id" label="" link={false} sortable={false}>
                  <MakeAdminBtn />
                </ReferenceField>
              </Datagrid>
            )}
          </ReferenceManyField>
        </FormTab>

        <FormTab
          label={translate("resources.users.membership", { smart_count: 2 })}
          icon={<FormatListBulletedIcon />}
          path="memberships"
        >
          <ReferenceManyField
            reference="memberships"
            target="user_id"
            label=""
            perPage={10}
            pagination={<Pagination />}
          >
            {isSmall ? (
              <MembershipsMobileList />
            ) : (
              <Datagrid
                sx={{ width: "100%" }}
                rowClick={id => "/rooms/" + id + "/show"}
                bulkActionButtons={false}
                empty={<EmptyState resource="memberships" />}
              >
                <ReferenceField reference="rooms" source="id" label="" link={false} sortable={false}>
                  <AvatarField source="avatar" sx={{ height: "40px", width: "40px" }} />
                </ReferenceField>
                <TextField
                  source="id"
                  label="resources.rooms.fields.room_id"
                  sortable={false}
                  sx={{ wordBreak: "break-all" }}
                />
                <ReferenceField
                  reference="rooms"
                  source="id"
                  label="resources.rooms.fields.name"
                  link={false}
                  sortable={false}
                >
                  <TextField source="name" />
                </ReferenceField>
                <TextField
                  source="membership"
                  label={translate("resources.users.membership", { smart_count: 1 })}
                  sortable={false}
                />
              </Datagrid>
            )}
          </ReferenceManyField>
        </FormTab>

        <FormTab
          label={translate("resources.pushers.name", { smart_count: 2 })}
          icon={<NotificationsIcon />}
          path="pushers"
        >
          <ReferenceManyField reference="pushers" target="user_id" label="" pagination={<Pagination />} perPage={10}>
            {isSmall ? (
              <SimpleList
                empty={<EmptyState resource="pushers" />}
                primaryText={record => (
                  <Box component="span" sx={{ wordBreak: "break-all" }}>
                    {record.app_display_name || record.app_id}
                  </Box>
                )}
                secondaryText={record => (
                  <>
                    {record.kind}
                    {record.device_display_name && <> · {record.device_display_name}</>}
                    {record.pushkey && (
                      <>
                        <br />
                        <Box component="span" sx={{ wordBreak: "break-all" }}>
                          {record.pushkey}
                        </Box>
                      </>
                    )}
                  </>
                )}
                rowClick={false}
              />
            ) : (
              <Datagrid
                sx={{ width: "100%" }}
                bulkActionButtons={false}
                omit={["app_id", "data.url", "profile_tag", "pushkey"]}
                empty={<EmptyState resource="pushers" />}
              >
                <TextField source="kind" sortable={false} />
                <TextField source="app_display_name" sortable={false} />
                <TextField source="app_id" sortable={false} />
                <TextField source="data.url" sortable={false} />
                <TextField source="device_display_name" sortable={false} />
                <TextField source="lang" sortable={false} />
                <TextField source="profile_tag" sortable={false} />
                <TextField source="pushkey" sortable={false} />
              </Datagrid>
            )}
          </ReferenceManyField>
        </FormTab>

        <FormTab label="ketesa.users.tabs.experimental" icon={<ScienceIcon />} path="experimental">
          <ExperimentalFeaturesList />
        </FormTab>

        <FormTab label="ketesa.users.tabs.limits" icon={<LockClockIcon />} path="limits">
          <UserRateLimits />
        </FormTab>

        <FormTab label="ketesa.users.tabs.account_data" icon={<DocumentScannerIcon />} path="accountdata">
          <UserAccountData />
        </FormTab>
      </TabbedForm>
    </Edit>
  );
};

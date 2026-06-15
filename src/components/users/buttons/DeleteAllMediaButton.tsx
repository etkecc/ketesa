import ActionCheck from "@mui/icons-material/CheckCircle";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AlertError from "@mui/icons-material/ErrorOutline";
import {
  Box,
  Button as MuiButton,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useId, useState } from "react";
import {
  Button,
  useDataProvider,
  useListContext,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
  useUnselectAll,
} from "react-admin";

import { SynapseDataProvider } from "../../../providers/types";

type DeletionStatus = "idle" | "active" | "done";

/**
 * Delete all media uploaded by a single user.
 * Shows a confirmation dialog with a spinner while running.
 */
export const DeleteUserMediaButton = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const record = useRecordContext();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DeletionStatus>("idle");
  const notify = useNotify();
  const translate = useTranslate();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const titleId = useId();

  if (!record) return null;

  const userName = (record.displayname || record.id) as string;

  const handleClose = () => {
    setOpen(false);
    if (status !== "active") setStatus("idle");
  };

  const handleDelete = async () => {
    setStatus("active");
    try {
      const result = await dataProvider.deleteUserMedia(record.id);
      notify("resources.users.action.delete_all_media.success", {
        type: "success",
        messageArgs: { smart_count: result.total },
      });
      setOpen(false);
      setStatus("idle");
    } catch (e) {
      setStatus("idle");
      notify("resources.users.action.delete_all_media.failure", {
        type: "error",
        messageArgs: { errMsg: e instanceof Error ? e.message : String(e) },
      });
    }
  };

  return (
    <>
      <Button
        label="resources.users.action.delete_all_media.label"
        onClick={() => setOpen(true)}
        disabled={status === "active"}
        color="error"
      >
        <DeleteForeverIcon />
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby={titleId}
      >
        <DialogTitle id={titleId}>
          {translate("resources.users.action.delete_all_media.title", { userName })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{translate("resources.users.action.delete_all_media.content")}</DialogContentText>
          {status === "active" && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }} aria-live="polite">
                <CircularProgress size={16} role="status" aria-label={translate("ra.message.loading")} />
                <Typography variant="body2" color="text.secondary">
                  {translate("resources.users.action.delete_all_media.in_progress")}
                </Typography>
              </Box>
              <DialogContentText sx={{ mt: 1, fontStyle: "italic" }} color="text.secondary">
                {translate("resources.users.action.delete_all_media.background_note")}
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleClose} startIcon={<AlertError />}>
            {translate("ra.action.cancel")}
          </MuiButton>
          <MuiButton
            onClick={handleDelete}
            disabled={status !== "idle"}
            aria-busy={status === "active"}
            className="ra-confirm RaConfirm-confirmPrimary"
            autoFocus
            startIcon={status === "active" ? <CircularProgress size={16} aria-hidden="true" /> : <ActionCheck />}
          >
            {translate("ra.action.confirm")}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Bulk delete all media for selected users.
 */
export const DeleteUserMediaBulkButton = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { selectedIds } = useListContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const unselectAll = useUnselectAll("users");
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const titleId = useId();

  const handleDelete = async () => {
    setLoading(true);
    const results = await Promise.allSettled(selectedIds.map(id => dataProvider.deleteUserMedia(id)));
    const success = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    setLoading(false);
    setOpen(false);
    if (failed === 0) {
      notify("resources.users.action.delete_all_media_bulk.success", {
        messageArgs: { success, total: selectedIds.length },
      });
    } else {
      notify("resources.users.action.delete_all_media_bulk.partial_failure", {
        type: "error",
        messageArgs: { success, failed, total: selectedIds.length },
      });
    }
    unselectAll();
    refresh();
  };

  return (
    <>
      <Button label="resources.users.action.delete_all_media.label" onClick={() => setOpen(true)} color="error">
        <DeleteForeverIcon />
      </Button>
      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        disableEscapeKeyDown={loading}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby={titleId}
      >
        <DialogTitle id={titleId}>
          {translate("resources.users.action.delete_all_media_bulk.title", {
            smart_count: selectedIds.length,
          })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{translate("resources.users.action.delete_all_media_bulk.content")}</DialogContentText>
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }} aria-live="polite">
              <CircularProgress size={16} role="status" aria-label={translate("ra.message.loading")} />
              <Typography variant="body2" color="text.secondary">
                {translate("resources.users.action.delete_all_media.in_progress")}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)} disabled={loading} startIcon={<AlertError />}>
            {translate("ra.action.cancel")}
          </MuiButton>
          <MuiButton
            onClick={handleDelete}
            disabled={loading}
            aria-busy={loading}
            className="ra-confirm RaConfirm-confirmPrimary"
            autoFocus
            startIcon={loading ? <CircularProgress size={16} aria-hidden="true" /> : <ActionCheck />}
          >
            {translate("ra.action.confirm")}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Delete all local media in a single room.
 * Only renders for unencrypted rooms (record.encryption is falsy).
 * Shows a dialog with live per-item progress counter.
 */
export const DeleteRoomMediaButton = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const record = useRecordContext();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DeletionStatus>("idle");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const notify = useNotify();
  const translate = useTranslate();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const titleId = useId();

  if (!record || record.encryption) return null;

  const roomName = (record.name || record.canonical_alias || record.id) as string;

  const handleClose = () => {
    if (status === "active") return;
    setOpen(false);
    setStatus("idle");
    setProgress(null);
  };

  const handleDelete = async () => {
    setStatus("active");
    setProgress(null);
    try {
      const result = await dataProvider.deleteRoomMedia(record.id as string, (current, total) => {
        setProgress({ current, total });
      });
      notify("resources.rooms.action.delete_all_media.success", {
        type: "success",
        messageArgs: { smart_count: result.total },
      });
      setOpen(false);
      setStatus("idle");
      setProgress(null);
    } catch (e) {
      setStatus("idle");
      setProgress(null);
      notify("resources.rooms.action.delete_all_media.failure", {
        type: "error",
        messageArgs: { errMsg: e instanceof Error ? e.message : String(e) },
      });
    }
  };

  const progressLabel =
    progress === null || progress.total === 0
      ? translate("resources.rooms.action.delete_all_media.in_progress_loading")
      : translate("resources.rooms.action.delete_all_media.in_progress", {
          current: progress.current,
          total: progress.total,
        });

  return (
    <>
      <Button label="resources.rooms.action.delete_all_media.label" onClick={() => setOpen(true)} color="error">
        <DeleteForeverIcon />
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        disableEscapeKeyDown={status === "active"}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby={titleId}
      >
        <DialogTitle id={titleId}>
          {translate("resources.rooms.action.delete_all_media.title", { roomName })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{translate("resources.rooms.action.delete_all_media.content")}</DialogContentText>
          {status === "active" && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }} aria-live="polite">
                <CircularProgress size={16} role="status" aria-label={translate("ra.message.loading")} />
                <Typography variant="body2" color="text.secondary">
                  {progressLabel}
                </Typography>
              </Box>
              <DialogContentText sx={{ mt: 1, fontStyle: "italic" }} color="warning.main">
                {translate("resources.rooms.action.delete_all_media.do_not_close")}
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleClose} disabled={status === "active"} startIcon={<AlertError />}>
            {translate("ra.action.cancel")}
          </MuiButton>
          <MuiButton
            onClick={handleDelete}
            disabled={status !== "idle"}
            aria-busy={status === "active"}
            className="ra-confirm RaConfirm-confirmPrimary"
            autoFocus
            startIcon={status === "active" ? <CircularProgress size={16} aria-hidden="true" /> : <ActionCheck />}
          >
            {translate("ra.action.confirm")}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Bulk delete all local media for selected rooms.
 * Unlike the single-room button, this does not filter out encrypted rooms; the room media
 * list endpoint only returns media from unencrypted events, so an encrypted room loses only
 * whatever unencrypted local media it has.
 */
export const DeleteRoomMediaBulkButton = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { selectedIds } = useListContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const unselectAll = useUnselectAll("rooms");
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const titleId = useId();

  const handleDelete = async () => {
    setLoading(true);
    const results = await Promise.allSettled(selectedIds.map(id => dataProvider.deleteRoomMedia(id as string)));
    const success = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    setLoading(false);
    setOpen(false);
    if (failed === 0) {
      notify("resources.rooms.action.delete_all_media_bulk.success", {
        messageArgs: { success, total: selectedIds.length },
      });
    } else {
      notify("resources.rooms.action.delete_all_media_bulk.partial_failure", {
        type: "error",
        messageArgs: { success, failed, total: selectedIds.length },
      });
    }
    unselectAll();
    refresh();
  };

  return (
    <>
      <Button label="resources.rooms.action.delete_all_media.label" onClick={() => setOpen(true)} color="error">
        <DeleteForeverIcon />
      </Button>
      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        disableEscapeKeyDown={loading}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby={titleId}
      >
        <DialogTitle id={titleId}>
          {translate("resources.rooms.action.delete_all_media_bulk.title", {
            smart_count: selectedIds.length,
          })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{translate("resources.rooms.action.delete_all_media_bulk.content")}</DialogContentText>
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }} aria-live="polite">
              <CircularProgress size={16} role="status" aria-label={translate("ra.message.loading")} />
              <Typography variant="body2" color="text.secondary">
                {translate("resources.rooms.action.delete_all_media.in_progress_loading")}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)} disabled={loading} startIcon={<AlertError />}>
            {translate("ra.action.cancel")}
          </MuiButton>
          <MuiButton
            onClick={handleDelete}
            disabled={loading}
            aria-busy={loading}
            className="ra-confirm RaConfirm-confirmPrimary"
            autoFocus
            startIcon={loading ? <CircularProgress size={16} aria-hidden="true" /> : <ActionCheck />}
          >
            {translate("ra.action.confirm")}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

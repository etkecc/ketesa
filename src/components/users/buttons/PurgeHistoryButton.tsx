import ActionCheck from "@mui/icons-material/CheckCircle";
import AlertError from "@mui/icons-material/ErrorOutline";
import HistoryIcon from "@mui/icons-material/History";
import {
  Box,
  Button as MuiButton,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button, useDataProvider, useNotify, useRecordContext, useTranslate } from "react-admin";

import { SynapseDataProvider } from "../../../providers/types";

export const PurgeHistoryButton = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const record = useRecordContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purgeDate, setPurgeDate] = useState("");
  const [deleteLocalEvents, setDeleteLocalEvents] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const notify = useNotify();
  const translate = useTranslate();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  if (!record) {
    return null;
  }

  const roomName = (record.name || record.canonical_alias || record.id) as string;

  const handleClose = () => {
    stopPolling();
    if (purgeStatus === "active") {
      // Purge continues server-side; surface that before dropping UI tracking
      notify("resources.rooms.action.purge_history.background_note", { type: "info" });
    }
    setOpen(false);
    setPurgeDate("");
    setDeleteLocalEvents(false);
    setPurgeStatus(null);
  };

  const handlePurge = async () => {
    if (!purgeDate) return;
    setLoading(true);
    setPurgeStatus(null);

    const purgeUpToTs = new Date(purgeDate).getTime();

    try {
      const result = await dataProvider.purgeHistory(record.id as string, purgeUpToTs, deleteLocalEvents);
      if (result.success && result.purge_id) {
        setPurgeStatus("active");
        pollRef.current = setInterval(async () => {
          const status = await dataProvider.getPurgeHistoryStatus(result.purge_id!);
          if (status.status === "complete") {
            stopPolling();
            setPurgeStatus(null);
            setLoading(false);
            notify("resources.rooms.action.purge_history.success", { type: "success" });
            handleClose();
          } else if (status.status === "failed") {
            stopPolling();
            setPurgeStatus(null);
            setLoading(false);
            notify("resources.rooms.action.purge_history.failure", {
              type: "error",
              messageArgs: { errMsg: status.error || "" },
            });
          }
        }, 3000);
      } else {
        setLoading(false);
        notify("resources.rooms.action.purge_history.failure", {
          type: "error",
          messageArgs: { errMsg: result.error || "" },
        });
      }
    } catch {
      setLoading(false);
      notify("resources.rooms.action.purge_history.failure", {
        type: "error",
        messageArgs: { errMsg: "" },
      });
    }
  };

  return (
    <>
      <Button label="resources.rooms.action.purge_history.label" onClick={() => setOpen(true)}>
        <HistoryIcon />
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby={titleId}
      >
        <DialogTitle id={titleId}>{translate("resources.rooms.action.purge_history.title", { roomName })}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {translate("resources.rooms.action.purge_history.content")}
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            type="datetime-local"
            label={translate("resources.rooms.action.purge_history.date_label")}
            value={purgeDate}
            onChange={e => setPurgeDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={<Checkbox checked={deleteLocalEvents} onChange={e => setDeleteLocalEvents(e.target.checked)} />}
            label={translate("resources.rooms.action.purge_history.delete_local")}
          />
          {purgeStatus === "active" && (
            <>
              <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} role="status" aria-label={translate("ra.message.loading")} />
                {translate("resources.rooms.action.purge_history.in_progress")}
              </Box>
              <DialogContentText sx={{ mt: 1 }}>
                {translate("resources.rooms.action.purge_history.background_note")}
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleClose} disabled={loading} startIcon={<AlertError />}>
            {translate("ra.action.cancel")}
          </MuiButton>
          <MuiButton
            onClick={handlePurge}
            disabled={!purgeDate || loading}
            aria-busy={loading}
            className="ra-confirm RaConfirm-confirmPrimary"
            startIcon={loading ? <CircularProgress size={16} aria-hidden="true" /> : <ActionCheck />}
          >
            {translate("ra.action.confirm")}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

import ActionCheck from "@mui/icons-material/CheckCircle";
import ActionDelete from "@mui/icons-material/Delete";
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Button,
  SimpleForm,
  BooleanInput,
  useTranslate,
  useNotify,
  useRedirect,
  NotificationType,
  useDeleteMany,
  useDataProvider,
  Identifier,
  useUnselectAll,
} from "react-admin";

import { SynapseDataProvider } from "../../../providers/types";
import { isMAS } from "../../../providers/data/mas";
import { jsonClient } from "../../../providers/http";

interface DeleteUserButtonProps {
  selectedIds: Identifier[];
  confirmTitle: string;
  confirmContent: string;
  /** MXID → mas_id mapping; required for MAS bulk deactivation. Entries are undefined for
   * Synapse-only users (no MAS account), which are routed through the Synapse v2 deactivate path. */
  masIdMap?: Record<string, string | undefined>;
}

const resourceName = "users";

const DeleteUserButton: React.FC<DeleteUserButtonProps> = props => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const translate = useTranslate();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [deleteMedia, setDeleteMedia] = useState(false);
  const [redactEvents, setRedactEvents] = useState(false);
  const [redactStatus, setRedactStatus] = useState<null | "active" | "done">(null);

  const notify = useNotify();
  const redirect = useRedirect();
  const dataProvider = useDataProvider() as SynapseDataProvider;

  const [deleteMany, { isLoading }] = useDeleteMany();
  const unselectAll = useUnselectAll(resourceName);
  const recordIds = props.selectedIds;
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

  const handleDialogOpen = () => setOpen(true);

  const performMASDeactivate = async () => {
    try {
      const baseUrl = localStorage.getItem("base_url") || "";
      await Promise.all(
        recordIds.map(async id => {
          const masId = props.masIdMap?.[String(id)];
          if (masId) {
            await dataProvider.masDeactivateUser(masId, false);
            return;
          }
          // Synapse-only user in MAS mode: soft-deactivate via Synapse v2.
          await jsonClient(`${baseUrl}/_synapse/admin/v2/users/${encodeURIComponent(String(id))}`, {
            method: "PUT",
            body: JSON.stringify({ deactivated: true }),
          });
        })
      );
      notify("ra.notification.deleted", {
        messageArgs: { smart_count: recordIds.length },
        type: "info" as NotificationType,
      });
      unselectAll();
      redirect("/users");
    } catch {
      notify("ra.notification.data_provider_error", { type: "error" as NotificationType });
    }
  };

  const performDelete = async () => {
    if (isMAS()) {
      await performMASDeactivate();
      return;
    }
    deleteMany(
      resourceName,
      { ids: recordIds, meta: { deleteMedia, redactEvents: false } },
      {
        onSuccess: () => {
          notify("ra.notification.deleted", {
            messageArgs: { smart_count: recordIds.length },
            type: "info" as NotificationType,
          });
          unselectAll();
          redirect("/users");
        },
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        onError: (error: any) =>
          notify(error?.message || "ra.notification.data_provider_error", { type: "error" as NotificationType }),
      }
    );
  };

  const handleDialogClose = async () => {
    if (redactStatus === "active") {
      // Redaction continues server-side; proceed with delete so the user is erased
      stopPolling();
      setRedactStatus(null);
      setOpen(false);
      await performDelete();
      return;
    }
    setOpen(false);
    setRedactStatus(null);
  };

  const handleConfirm = async () => {
    if (!redactEvents) {
      setOpen(false);
      await performDelete();
      return;
    }

    // Redact events first, then poll, then delete
    setRedactStatus("active");

    try {
      const results = await Promise.all(recordIds.map(id => dataProvider.redactUserEvents(id)));
      const redactIds = results.map(r => r.redact_id);

      const pending = new Set(redactIds);
      let totalFailed = 0;

      pollRef.current = setInterval(async () => {
        const statuses = await Promise.all(
          [...pending].map(async redactId => {
            const status = await dataProvider.getRedactStatus(redactId);
            return { redactId, ...status };
          })
        );

        for (const s of statuses) {
          if (s.status === "complete") {
            totalFailed += Object.keys(s.failed_redactions).length;
            pending.delete(s.redactId);
          } else if (s.status === "failed") {
            pending.delete(s.redactId);
          }
        }

        if (pending.size === 0) {
          stopPolling();
          setRedactStatus("done");
          setOpen(false);

          if (totalFailed > 0) {
            notify("resources.users.action.redact_failure", {
              type: "warning" as NotificationType,
              messageArgs: { smart_count: totalFailed },
            });
          } else {
            notify("resources.users.action.redact_success", { type: "success" as NotificationType });
          }

          await performDelete();
        }
      }, 3000);
    } catch {
      stopPolling();
      setRedactStatus(null);
      notify("ra.notification.data_provider_error", { type: "error" as NotificationType });
    }
  };

  const loading = isLoading || redactStatus === "active";

  return (
    <Fragment>
      <Button
        label="ra.action.delete"
        onClick={handleDialogOpen}
        disabled={loading}
        className={"ra-delete-button"}
        key="button"
        color={"error"}
      >
        <ActionDelete />
      </Button>
      <Dialog
        open={open}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby={titleId}
      >
        <DialogTitle id={titleId}>{translate(props.confirmTitle)}</DialogTitle>
        <DialogContent>
          <DialogContentText>{translate(props.confirmContent)}</DialogContentText>
          <SimpleForm toolbar={false}>
            {!isMAS() && (
              <>
                <BooleanInput
                  source="deleteMedia"
                  value={deleteMedia}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDeleteMedia(event.target.checked)}
                  label="resources.users.action.delete_media"
                  defaultValue={false}
                  disabled={loading}
                />
                <BooleanInput
                  source="redactEvents"
                  value={redactEvents}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRedactEvents(event.target.checked)}
                  label="resources.users.action.redact_events"
                  defaultValue={false}
                  disabled={loading}
                />
              </>
            )}
          </SimpleForm>
          {redactStatus === "active" && (
            <>
              <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} role="status" aria-label={translate("ra.message.loading")} />
                {translate("resources.users.action.redact_in_progress")}
              </Box>
              <DialogContentText sx={{ mt: 1 }}>
                {translate("resources.users.action.redact_background_note")}
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleDialogClose} startIcon={<AlertError />}>
            {translate("ra.action.cancel")}
          </MuiButton>
          <MuiButton
            disabled={loading}
            aria-busy={loading}
            onClick={handleConfirm}
            className={"ra-confirm RaConfirm-confirmPrimary"}
            autoFocus
            startIcon={loading ? <CircularProgress size={16} aria-hidden="true" /> : <ActionCheck />}
          >
            {translate("ra.action.confirm")}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
};

export default DeleteUserButton;

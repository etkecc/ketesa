import CloudOffIcon from "@mui/icons-material/CloudOff";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button as MuiButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  ButtonProps,
  DateTimeInput,
  SaveButton,
  SimpleForm,
  useDataProvider,
  useNotify,
  useTranslate,
} from "react-admin";

import { DeleteMediaParams, SynapseDataProvider } from "../../providers/types";
import { dateFormatter, dateParser } from "../../utils/date";

const PurgeRemoteMediaDialog = ({ defaultBeforeTs, open, onClose, onSubmit }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const translate = useTranslate();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{translate("purge_remote_media.action.send")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{translate("purge_remote_media.helper.send")}</DialogContentText>
        <SimpleForm toolbar={false} onSubmit={onSubmit}>
          <DateTimeInput
            source="before_ts"
            label="purge_remote_media.fields.before_ts"
            defaultValue={defaultBeforeTs}
            parse={dateParser}
            format={dateFormatter}
          />
          <DialogActions sx={{ width: "100%", px: 0 }}>
            <MuiButton onClick={onClose}>{translate("ra.action.cancel")}</MuiButton>
            <SaveButton label="purge_remote_media.action.send" icon={<CloudOffIcon />} />
          </DialogActions>
        </SimpleForm>
      </DialogContent>
    </Dialog>
  );
};

export const PurgeRemoteMediaButton = (props: ButtonProps) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  // Placeholder; computed fresh when the dialog opens (see openDialog) so the cutoff is "now" at the
  // moment of action, not page load: an incident responder purging just-federated media needs it to reach.
  const [defaultBeforeTs, setDefaultBeforeTs] = useState(0);
  const notify = useNotify();
  const dataProvider = useDataProvider<SynapseDataProvider>();
  const { mutate: purgeRemoteMedia, isPending } = useMutation({
    mutationFn: (values: Pick<DeleteMediaParams, "before_ts">) => dataProvider.purgeRemoteMedia(values),
    onSuccess: data => {
      if (data.total > 0) {
        notify("purge_remote_media.action.send_success", {
          type: "success",
          messageArgs: { smart_count: data.total },
        });
      } else {
        notify("purge_remote_media.action.send_success_none", {
          type: "warning",
        });
      }
      closeDialog();
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onError: (error: any) => {
      notify(error?.message || "purge_remote_media.action.send_failure", {
        type: "error",
      });
    },
  });

  const openDialog = () => {
    setDefaultBeforeTs(new Date().getTime());
    setOpen(true);
  };
  const closeDialog = () => setOpen(false);

  return (
    <>
      <Button
        {...props}
        label="purge_remote_media.action.send"
        onClick={openDialog}
        disabled={isPending}
        sx={{
          color: theme.palette.error.main,
          "&:hover": {
            backgroundColor: alpha(theme.palette.error.main, 0.12),
            // Reset on mouse devices
            "@media (hover: none)": {
              backgroundColor: "transparent",
            },
          },
        }}
      >
        <CloudOffIcon />
      </Button>
      <PurgeRemoteMediaDialog
        defaultBeforeTs={defaultBeforeTs}
        open={open}
        onClose={closeDialog}
        onSubmit={purgeRemoteMedia}
      />
    </>
  );
};

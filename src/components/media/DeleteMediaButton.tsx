import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
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
  BooleanInput,
  Button,
  ButtonProps,
  DateTimeInput,
  NumberInput,
  SaveButton,
  SimpleForm,
  useDataProvider,
  useNotify,
  useTranslate,
} from "react-admin";

import { DeleteMediaParams, SynapseDataProvider } from "../../providers/types";
import { dateFormatter, dateParser } from "../../utils/date";

const DeleteMediaDialog = ({ defaultBeforeTs, open, onClose, onSubmit }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const translate = useTranslate();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{translate("delete_media.action.send")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{translate("delete_media.helper.send")}</DialogContentText>
        <SimpleForm toolbar={false} onSubmit={onSubmit}>
          <DateTimeInput
            source="before_ts"
            label="delete_media.fields.before_ts"
            defaultValue={defaultBeforeTs}
            parse={dateParser}
            format={dateFormatter}
          />
          <NumberInput source="size_gt" label="delete_media.fields.size_gt" defaultValue={0} min={0} step={1024} />
          <BooleanInput source="keep_profiles" label="delete_media.fields.keep_profiles" defaultValue={true} />
          <DialogActions sx={{ width: "100%", px: 0 }}>
            <MuiButton onClick={onClose}>{translate("ra.action.cancel")}</MuiButton>
            <SaveButton label="delete_media.action.send" icon={<DeleteSweepIcon />} />
          </DialogActions>
        </SimpleForm>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteMediaButton = (props: ButtonProps) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  // Placeholder; the real cutoff is computed fresh when the dialog opens (see openDialog).
  const [defaultBeforeTs, setDefaultBeforeTs] = useState(0);
  const notify = useNotify();
  const dataProvider = useDataProvider<SynapseDataProvider>();
  const { mutate: deleteMedia, isPending } = useMutation({
    mutationFn: (values: DeleteMediaParams) => dataProvider.deleteMedia(values),
    onSuccess: data => {
      if (data.total > 0) {
        notify("delete_media.action.send_success", {
          type: "success",
          messageArgs: { smart_count: data.total },
        });
      } else {
        notify("delete_media.action.send_success_none", {
          type: "warning",
        });
      }
      closeDialog();
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onError: (error: any) => {
      notify(error?.message || "delete_media.action.send_failure", {
        type: "error",
      });
    },
  });

  const openDialog = () => {
    // before_ts is last-access time; default the cutoff to ~90 days (a quarter) ago, computed fresh
    // on open, so it sweeps only media untouched that long and spares anything still in use.
    setDefaultBeforeTs(new Date().getTime() - 90 * 24 * 60 * 60 * 1000);
    setOpen(true);
  };
  const closeDialog = () => setOpen(false);

  return (
    <>
      <Button
        {...props}
        label="delete_media.action.send"
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
        <DeleteSweepIcon />
      </Button>
      <DeleteMediaDialog defaultBeforeTs={defaultBeforeTs} open={open} onClose={closeDialog} onSubmit={deleteMedia} />
    </>
  );
};

import ActionCheck from "@mui/icons-material/CheckCircle";
import AlertError from "@mui/icons-material/ErrorOutline";
import {
  Button as MuiButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useId, useState } from "react";
import { useTranslate } from "react-admin";

interface TypeToConfirmDialogProps {
  isOpen: boolean;
  title: string;
  content: string;
  /** The exact string the operator must type to enable Confirm (e.g. the user's full MXID). */
  expectedValue: string;
  inputLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Strong confirmation dialog: the Confirm button stays disabled until the operator types
 * `expectedValue` exactly. Reserved for irreversible actions (GDPR erase) where a single
 * misclick is unrecoverable. Mirrors the dialog a11y/structure of DeleteUserButton.
 */
const TypeToConfirmDialog: React.FC<TypeToConfirmDialogProps> = props => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const translate = useTranslate();
  const titleId = useId();
  const [value, setValue] = useState("");

  // Clear the typed value whenever the dialog closes so it can't carry over to a reopen.
  useEffect(() => {
    if (!props.isOpen) setValue("");
  }, [props.isOpen]);

  const matches = value.trim() === props.expectedValue.trim();

  const handleConfirm = () => {
    if (!matches) return;
    setValue("");
    props.onConfirm();
  };

  return (
    <Dialog
      open={props.isOpen}
      onClose={props.onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.content}</DialogContentText>
        <TextField
          value={value}
          onChange={e => setValue(e.target.value)}
          label={props.inputLabel}
          fullWidth
          autoFocus
          autoComplete="off"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={props.onClose} startIcon={<AlertError />}>
          {translate("ra.action.cancel")}
        </MuiButton>
        <MuiButton
          disabled={!matches}
          onClick={handleConfirm}
          className={"ra-confirm RaConfirm-confirmPrimary"}
          startIcon={<ActionCheck />}
        >
          {translate("ra.action.confirm")}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
};

export default TypeToConfirmDialog;

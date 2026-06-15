import BlockIcon from "@mui/icons-material/Block";
import RestoreIcon from "@mui/icons-material/RestoreFromTrash";
import { useState } from "react";
import {
  Button,
  DateTimeInput,
  DeleteButton,
  Edit,
  EditProps,
  NumberInput,
  SaveButton,
  SimpleForm,
  TextInput,
  Toolbar,
  number,
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from "react-admin";

import { useDocTitle } from "../../components/hooks/useDocTitle";
import { useIsMAS } from "../../providers/data/mas";
import { SynapseDataProvider } from "../../providers/types";
import { dateFormatter, dateParser } from "../../utils/date";

const validateUsesAllowed = [number()];

export const RevokeTokenButton = () => {
  const record = useRecordContext();
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const isMAS = useIsMAS();

  if (!record || !isMAS) return null;

  const isRevoked = !!record.revoked_at;

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await dataProvider.revokeRegistrationToken(record.id as string, !isRevoked);
      if (result.success) {
        notify(
          isRevoked
            ? "resources.registration_tokens.action.unrevoke.success"
            : "resources.registration_tokens.action.revoke.success"
        );
        refresh();
      } else {
        notify(result.error || "ra.notification.http_error", { type: "error" });
      }
    } catch {
      notify("ra.notification.http_error", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      label={
        isRevoked
          ? "resources.registration_tokens.action.unrevoke.label"
          : "resources.registration_tokens.action.revoke.label"
      }
      onClick={handleClick}
      disabled={loading}
    >
      {isRevoked ? <RestoreIcon /> : <BlockIcon />}
    </Button>
  );
};

const RegistrationTokenEditToolbar = () => {
  const isMAS = useIsMAS();
  return (
    <Toolbar sx={{ justifyContent: "space-between" }}>
      <SaveButton />
      <RevokeTokenButton />
      {!isMAS && <DeleteButton redirect="list" />}
    </Toolbar>
  );
};

export const RegistrationTokenEdit = (props: EditProps) => {
  const translate = useTranslate();
  const isMAS = useIsMAS();
  useDocTitle(`${translate("ra.action.edit")} ${translate("resources.registration_tokens.name")}`);

  return (
    <Edit
      {...props}
      sx={{ "& .RaEdit-card": { maxWidth: { xs: "100vw", sm: "calc(100vw - 32px)" }, overflowX: "auto" } }}
    >
      <SimpleForm toolbar={<RegistrationTokenEditToolbar />}>
        <TextInput source="token" disabled />
        <NumberInput source="pending" disabled />
        <NumberInput source="completed" disabled />
        <NumberInput source="uses_allowed" validate={validateUsesAllowed} step={1} />
        <DateTimeInput source="expiry_time" parse={dateParser} format={dateFormatter} />
        {isMAS && <DateTimeInput source="created_at" disabled />}
        {isMAS && <DateTimeInput source="last_used_at" disabled />}
        {isMAS && <DateTimeInput source="revoked_at" disabled />}
      </SimpleForm>
    </Edit>
  );
};

import { Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import {
  ArrayInput,
  BooleanInput,
  Confirm,
  Create,
  CreateProps,
  SelectInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
  maxLength,
  required,
  useCreate,
  useDataProvider,
  useNotify,
  useRedirect,
  useTranslate,
} from "react-admin";

import { useDocTitle } from "../../components/hooks/useDocTitle";
import { User, UsernameAvailabilityResult } from "../../providers/types";
import type { SynapseDataProvider } from "../../providers/types";
import { isMAS } from "../../providers/data/mas";
import { choices_medium, choices_type, validateUser, validateAddress, UserPasswordInput } from "./Edit";

export const UserCreate = (props: CreateProps) => {
  if (isMAS()) {
    return <MASUserCreate {...props} />;
  }
  return <SynapseUserCreate {...props} />;
};

const MASUserCreate = (props: CreateProps) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const redirect = useRedirect();
  const notify = useNotify();
  const [create] = useCreate();

  useDocTitle(translate("ra.action.create_item", { item: translate("resources.users.name") }));

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const handleSubmit = async (data: Record<string, any>) => {
    let record: User;
    try {
      record = await create("users", { data: { username: data.username } }, { returnPromise: true });
    } catch {
      return; // RA shows error notification automatically
    }

    const masId = (record as unknown as Record<string, unknown>)?.mas_id as string | undefined;
    const failures: string[] = [];

    if (masId && data.admin) {
      try {
        const result = await dataProvider.masSetAdmin(masId, true);
        if (!result.success) failures.push(result.error || translate("resources.users.action.set_admin_failure"));
      } catch {
        failures.push(translate("resources.users.action.set_admin_failure"));
      }
    }

    if (masId && data.password) {
      try {
        const result = await dataProvider.masSetPassword(masId, data.password);
        if (!result.success) failures.push(result.error || translate("resources.users.action.set_password_failure"));
      } catch {
        failures.push(translate("resources.users.action.set_password_failure"));
      }
    }

    if (failures.length > 0) {
      notify(failures.join("; "), { type: "error" });
    } else {
      notify("ra.notification.created", { messageArgs: { smart_count: 1 } });
    }
    // The user exists regardless; redirect to it so a failed admin/password step is fixable
    // from the edit view rather than rolled back.
    redirect(() => `users/${encodeURIComponent(record.id as string)}`);
  };

  return (
    <Create {...props}>
      <SimpleForm onSubmit={handleSubmit}>
        <TextInput source="username" validate={validateUser} autoComplete="off" />
        <UserPasswordInput source="password" autoComplete="new-password" />
        <BooleanInput source="admin" />
      </SimpleForm>
    </Create>
  );
};

const SynapseUserCreate = (props: CreateProps) => {
  const dataProvider = useDataProvider();
  const translate = useTranslate();
  const redirect = useRedirect();
  const notify = useNotify();
  const theme = useTheme();

  useDocTitle(translate("ra.action.create_item", { item: translate("resources.users.name") }));

  const [open, setOpen] = useState(false);
  const [userIsAvailable, setUserIsAvailable] = useState<boolean | undefined>();
  const [userAvailabilityEl, setUserAvailabilityEl] = useState<React.ReactElement | false>(
    <Typography component="span"></Typography>
  );
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [create] = useCreate();

  const checkAvailability = async (event: React.FocusEvent<HTMLInputElement>) => {
    const username = event.target.value;
    const result: UsernameAvailabilityResult = await dataProvider.checkUsernameAvailability(username);
    setUserIsAvailable(!!result?.available);
    if (result?.available) {
      setUserAvailabilityEl(
        <Typography component="span" variant="body2" sx={{ color: theme.palette.success.main }}>
          ✔️ {translate("resources.users.helper.username_available")}
        </Typography>
      );
    } else {
      setUserAvailabilityEl(
        <Typography component="span" variant="body2" sx={{ color: theme.palette.warning.main }}>
          ⚠️ {result?.error || "unknown error"}
        </Typography>
      );
    }
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const postSave = (data: Record<string, any>) => {
    setFormData(data);
    if (!userIsAvailable) {
      setOpen(true);
      return;
    }

    create(
      "users",
      { data: data },
      {
        onSuccess: (resource: User) => {
          notify("ra.notification.created", { messageArgs: { smart_count: 1 } });
          redirect(() => {
            return `users/${encodeURIComponent(resource.id as string)}`;
          });
        },
      }
    );
  };

  const handleConfirm = () => {
    setOpen(false);
    updateUser();
  };

  const handleDialogClose = () => {
    setOpen(false);
  };

  const updateUser = () => {
    create(
      "users",
      { data: formData },
      {
        onSuccess: (resource: User) => {
          notify("ra.notification.updated", { messageArgs: { smart_count: 1 } });
          redirect(() => {
            return `users/${encodeURIComponent(resource.id as string)}`;
          });
        },
      }
    );
  };

  return (
    <Create {...props}>
      <SimpleForm onSubmit={postSave}>
        <TextInput
          source="id"
          autoComplete="off"
          validate={validateUser}
          onBlur={checkAvailability}
          helperText={userAvailabilityEl}
        />
        <TextInput source="displayname" validate={maxLength(256)} />
        <UserPasswordInput source="password" autoComplete="new-password" helperText="resources.users.helper.password" />
        <SelectInput source="user_type" choices={choices_type} translateChoice={false} resettable />
        <BooleanInput source="admin" />
        <ArrayInput source="threepids">
          <SimpleFormIterator disableReordering>
            <SelectInput source="medium" choices={choices_medium} validate={required()} />
            <TextInput source="address" validate={validateAddress} />
          </SimpleFormIterator>
        </ArrayInput>
        <ArrayInput source="external_ids" label="ketesa.users.tabs.sso">
          <SimpleFormIterator disableReordering>
            <TextInput source="auth_provider" validate={required()} />
            <TextInput source="external_id" label="resources.users.fields.id" validate={required()} />
          </SimpleFormIterator>
        </ArrayInput>
      </SimpleForm>
      <Confirm
        isOpen={open}
        title="resources.users.action.overwrite_title"
        content="resources.users.action.overwrite_content"
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
        confirm="resources.users.action.overwrite_confirm"
        cancel="resources.users.action.overwrite_cancel"
      />
    </Create>
  );
};
// end SynapseUserCreate

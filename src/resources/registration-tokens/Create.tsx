import {
  Create,
  CreateProps,
  DateTimeInput,
  NumberInput,
  SaveButton,
  SimpleForm,
  TextInput,
  Toolbar,
  maxValue,
  number,
  regex,
  useTranslate,
} from "react-admin";

import { useDocTitle } from "../../components/hooks/useDocTitle";
import { useIsMAS } from "../../providers/data/mas";
import { dateParser } from "../../utils/date";

const validateToken = [regex(/^[A-Za-z0-9._~-]{0,64}$/)];
const validateUsesAllowed = [number()];
const validateLength = [number(), maxValue(64)];

export const RegistrationTokenCreate = (props: CreateProps) => {
  const translate = useTranslate();
  const isMAS = useIsMAS();
  useDocTitle(translate("ra.action.create_item", { item: translate("resources.registration_tokens.name") }));

  return (
    <Create {...props} redirect="list">
      <SimpleForm
        toolbar={
          <Toolbar>
            {/* It is possible to create tokens per default without input. */}
            <SaveButton alwaysEnable />
          </Toolbar>
        }
      >
        <TextInput source="token" autoComplete="off" validate={validateToken} resettable />
        {!isMAS && (
          <NumberInput
            source="length"
            validate={validateLength}
            helperText="resources.registration_tokens.helper.length"
            step={1}
          />
        )}
        <NumberInput source="uses_allowed" validate={validateUsesAllowed} step={1} />
        <DateTimeInput source="expiry_time" parse={dateParser} />
      </SimpleForm>
    </Create>
  );
};

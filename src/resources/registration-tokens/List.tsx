import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  BooleanInput,
  DateField,
  DeleteButton,
  ListProps,
  NumberField,
  SimpleList,
  TextField,
  useLocale,
  useTranslate,
} from "react-admin";

import { useDocTitle } from "../../components/hooks/useDocTitle";
import { useIsMAS } from "../../providers/data/mas";
import { DATE_FORMAT } from "../../utils/date";
import { Datagrid, EmptyState, List } from "../../components/layout";
import { RevokeTokenButton } from "./Edit";

const registrationTokenFilters = [<BooleanInput key="valid" source="valid" />];

export const RegistrationTokenList = (props: ListProps) => {
  const locale = useLocale();
  const translate = useTranslate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isMAS = useIsMAS();
  useDocTitle(translate("resources.registration_tokens.name", { smart_count: 2 }));
  return (
    <List
      {...props}
      filters={registrationTokenFilters}
      filterDefaultValues={{ valid: true }}
      pagination={false}
      perPage={50}
      empty={<EmptyState />}
    >
      {isSmall ? (
        <SimpleList
          primaryText={record => (
            <Box component="span" sx={{ wordBreak: "break-all" }}>
              {record.token}
            </Box>
          )}
          secondaryText={record => (
            <>
              {translate("resources.registration_tokens.fields.uses_allowed")}: {record.uses_allowed ?? "∞"}
              {" · "}
              {translate("resources.registration_tokens.fields.completed")}: {record.completed ?? 0}
              {record.expiry_time && (
                <>
                  <br />
                  {translate("resources.registration_tokens.fields.expiry_time")}:{" "}
                  {new Date(record.expiry_time).toLocaleString(locale)}
                </>
              )}
            </>
          )}
          tertiaryText={() => (isMAS ? <RevokeTokenButton /> : <DeleteButton redirect={false} />)}
          rowClick="edit"
        />
      ) : (
        <Datagrid
          rowLabel={record => String(record.token)}
          rowClick="edit"
          bulkActionButtons={isMAS ? false : undefined}
        >
          <TextField source="token" sortable={false} label="resources.registration_tokens.fields.token" />
          <NumberField
            source="uses_allowed"
            sortable={false}
            label="resources.registration_tokens.fields.uses_allowed"
          />
          <NumberField source="pending" sortable={false} label="resources.registration_tokens.fields.pending" />
          <NumberField source="completed" sortable={false} label="resources.registration_tokens.fields.completed" />
          <DateField
            source="expiry_time"
            showTime
            options={DATE_FORMAT}
            sortable={false}
            label="resources.registration_tokens.fields.expiry_time"
            locales={locale}
          />
          {isMAS && (
            <DateField
              source="created_at"
              showTime
              options={DATE_FORMAT}
              sortable={false}
              label="resources.registration_tokens.fields.created_at"
              locales={locale}
            />
          )}
          {isMAS && (
            <DateField
              source="last_used_at"
              showTime
              options={DATE_FORMAT}
              sortable={false}
              label="resources.registration_tokens.fields.last_used_at"
              locales={locale}
            />
          )}
          {isMAS && (
            <DateField
              source="revoked_at"
              showTime
              options={DATE_FORMAT}
              sortable={false}
              label="resources.registration_tokens.fields.revoked_at"
              locales={locale}
            />
          )}
        </Datagrid>
      )}
    </List>
  );
};

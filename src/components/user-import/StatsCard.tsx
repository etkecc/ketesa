import { Card, Paper, Stack, CardContent, CardHeader, Container, Typography } from "@mui/material";
import { NativeSelect } from "@mui/material";
import { useTranslate } from "ra-core";
import { ChangeEventHandler } from "react";

import { ImportResult, ParsedStats, Progress } from "./types";

const StatsCard = ({
  stats,
  progress,
  importResults,
  useridMode,
  onUseridModeChanged,
}: {
  stats: ParsedStats | null;
  progress: Progress;
  importResults: ImportResult | null;
  useridMode: string;
  onUseridModeChanged: ChangeEventHandler<HTMLSelectElement>;
}) => {
  const translate = useTranslate();

  if (!stats) {
    return null;
  }

  if (importResults) {
    return null;
  }

  return (
    <>
      <Container sx={{ mb: 3 }}>
        <Paper>
          <Card>
            <CardHeader
              title={translate("import_users.cards.importstats.header")}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            />
            <CardContent>
              <Stack spacing={1}>
                <Typography>{translate("import_users.cards.importstats.users_total", stats.total)}</Typography>
                <Typography>{translate("import_users.cards.importstats.guest_count", stats.is_guest)}</Typography>
                <Typography>{translate("import_users.cards.importstats.admin_count", stats.admin)}</Typography>
              </Stack>
            </CardContent>
            <CardHeader
              title={translate("import_users.cards.ids.header")}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            />
            <CardContent>
              <Stack spacing={2}>
                <Typography>
                  {stats.id === stats.total
                    ? translate("import_users.cards.ids.all_ids_present")
                    : translate("import_users.cards.ids.count_ids_present", stats.id)}
                </Typography>
                {stats.id > 0 && (
                  <NativeSelect onChange={onUseridModeChanged} value={useridMode} disabled={progress !== null}>
                    <option value={"ignore"}>{translate("import_users.cards.ids.mode.ignore")}</option>
                    <option value={"update"}>{translate("import_users.cards.ids.mode.update")}</option>
                  </NativeSelect>
                )}
              </Stack>
            </CardContent>
            <CardHeader
              title={translate("import_users.cards.passwords.header")}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            />
            <CardContent>
              <Stack spacing={1}>
                <Typography>
                  {stats.password === stats.total
                    ? translate("import_users.cards.passwords.all_passwords_present")
                    : translate("import_users.cards.passwords.count_passwords_present", stats.password)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </>
  );
};

export default StatsCard;

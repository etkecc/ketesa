import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert,
  Box,
  CardContent,
  CardHeader,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Link, useTranslate } from "react-admin";

import { ImportResult } from "./types";

const ResultsCard = ({
  importResults,
  downloadSkippedRecords,
}: {
  importResults: ImportResult | null;
  downloadSkippedRecords: () => void;
}) => {
  const translate = useTranslate();

  if (!importResults) {
    return null;
  }

  return (
    <Container>
      <Paper>
        <CardHeader
          title={translate("import_users.cards.results.header")}
          pb={0}
          sx={{
            borderBottom: 1,
          }}
        />
        <CardContent>
          <Stack spacing={2}>
            <Typography key="total" color="text.primary">
              {translate("import_users.cards.results.total", importResults.totalRecordCount)}
            </Typography>
            <Typography key="successful" color="success.main">
              {translate("import_users.cards.results.successful", importResults.succeededRecords.length)}
            </Typography>
            <List dense>
              {importResults.succeededRecords.map(record => (
                <ListItem key={record.id}>
                  <ListItemText primary={record.displayname} />
                </ListItem>
              ))}
            </List>
            {importResults.skippedRecords.length > 0 && (
              <Box>
                <Typography key="skipped" color="warning.main">
                  {translate("import_users.cards.results.skipped", importResults.skippedRecords.length)}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadSkippedRecords}
                  sx={{ mt: 2 }}
                  label={translate("import_users.cards.results.download_skipped")}
                ></Button>
              </Box>
            )}
            {importResults.wasDryRun && (
              <Alert severity="warning" key="simulated">
                {translate("import_users.cards.results.simulated_only")}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Paper>
      <Box sx={{ mt: 2 }}>
        <Link to="/users">
          <Button variant="outlined" startIcon={<ArrowBackIcon />} label={translate("ra.action.back")} />
        </Link>
      </Box>
    </Container>
  );
};

export default ResultsCard;

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Stack,
  TextField,
  useMediaQuery,
} from "@mui/material";
import DialogTitle from "@mui/material/DialogTitle";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDataProvider, useLocale, useNotify, useTranslate } from "react-admin";

import { CompanyDetails, SynapseDataProvider } from "../../providers/types";
import { countryCodes, countryName } from "../../utils/countries";
import createLogger from "../../utils/logger";

const log = createLogger("company-details");

const KEY = "etkecc.billing.company_details";

// keys are the API field names; country renders as a selector, the rest as text inputs.
const FIELDS = [
  { key: "fiscal_id", label: "vat_id" },
  { key: "name", label: "company_name" },
  { key: "country", label: "country" },
  { key: "address", label: "address" },
  { key: "postal_code", label: "postal_code" },
  { key: "city", label: "city" },
] as const;

const blankCompany = (): CompanyDetails => ({
  fiscal_id: "",
  name: "",
  country: "",
  address: "",
  postal_code: "",
  city: "",
});

const trimmedCompany = (company: CompanyDetails): CompanyDetails => ({
  fiscal_id: company.fiscal_id.trim(),
  name: company.name.trim(),
  country: company.country.trim(),
  address: company.address.trim(),
  postal_code: company.postal_code.trim(),
  city: company.city.trim(),
});

export const CompanyDetailsDialog = ({
  etkeccAdmin,
  open,
  onClose,
}: {
  etkeccAdmin: string;
  open: boolean;
  onClose: () => void;
}) => {
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const locale = useLocale();
  const notify = useNotify();
  const translate = useTranslate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [values, setValues] = useState<CompanyDetails>(blankCompany);
  const [loaded, setLoaded] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Read locale via a ref: a language switch mid-edit must not refetch and clobber unsaved changes.
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  });

  // Fetch on open: no network while closed, and a reopen always reflects the stored company.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setValues(blankCompany());
    setLoaded(null);
    setLoadError(null);
    setSaveError(null);
    setLoading(true);
    (async () => {
      try {
        const company = await dataProvider.getCompany(etkeccAdmin, localeRef.current);
        if (!active) return;
        if (company) {
          setLoaded(company);
          setValues(company);
        }
      } catch (error) {
        log.error("failed to load company details", { error });
        if (active) {
          const message = error instanceof Error ? error.message : "";
          setLoadError(message || `${KEY}.error_load`);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, etkeccAdmin, dataProvider]);

  const countries = useMemo(
    () => [...countryCodes].sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale)),
    [locale]
  );

  const allFilled = FIELDS.every(field => values[field.key].trim() !== "");
  // An unchanged form would just re-run the VIES check on identical data, so save stays off until an edit lands.
  const changed = FIELDS.some(field => values[field.key].trim() !== (loaded ? loaded[field.key].trim() : ""));
  const canSave = allFilled && changed && !saving;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSend = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await dataProvider.upsertCompany(etkeccAdmin, locale, trimmedCompany(values));
      notify(translate(`${KEY}.saved`), { type: "success" });
      onClose();
    } catch (error) {
      log.error("failed to save company details", { error });
      const message = error instanceof Error ? error.message : "";
      setSaveError(message || `${KEY}.error`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={isSmall} fullWidth maxWidth="sm">
      <DialogTitle>{translate(`${KEY}.title`)}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : loadError ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {loadError.startsWith("etkecc.") ? translate(loadError) : loadError}
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DialogContentText>{translate(`${KEY}.description`)}</DialogContentText>
            {saveError && (
              <Alert severity="error">{saveError.startsWith("etkecc.") ? translate(saveError) : saveError}</Alert>
            )}
            {FIELDS.map(field =>
              field.key === "country" ? (
                <Autocomplete
                  key={field.key}
                  fullWidth
                  options={countries}
                  value={values.country || null}
                  onChange={(_event, code) => setValues(prev => ({ ...prev, country: code ?? "" }))}
                  getOptionLabel={code => countryName(code, locale)}
                  filterOptions={(codes, state) => {
                    const query = state.inputValue.trim().toLowerCase();
                    if (!query) return codes;
                    return codes.filter(
                      code =>
                        code.toLowerCase().startsWith(query) || countryName(code, locale).toLowerCase().includes(query)
                    );
                  }}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderInput={params => <TextField {...params} label={translate(`${KEY}.fields.country`)} required />}
                  disabled={saving}
                />
              ) : (
                <TextField
                  key={field.key}
                  label={translate(`${KEY}.fields.${field.label}`)}
                  value={values[field.key]}
                  onChange={event => setValues(prev => ({ ...prev, [field.key]: event.target.value }))}
                  fullWidth
                  required
                  disabled={saving}
                />
              )
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {translate(`${KEY}.cancel`)}
        </Button>
        {!loading && !loadError && (
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!canSave}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            {translate(saving ? `${KEY}.saving` : `${KEY}.save`)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

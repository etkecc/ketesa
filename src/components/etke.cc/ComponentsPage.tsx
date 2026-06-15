import ExtensionIcon from "@mui/icons-material/Extension";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Link,
  List,
  ListItem,
  Paper,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Title, useDataProvider, useLocale, useNotify, useRedirect, useTranslate } from "react-admin";

import { EtkeAttribution } from "./EtkeAttribution";
import { useAppContext } from "../../Context";
import { useInstanceConfig } from "./InstanceConfig";
import { SynapseDataProvider, Component, ComponentSection, SupportRequest } from "../../providers/types";
import createLogger from "../../utils/logger";
import { tt } from "../../utils/safety";
import { useDocTitle } from "../hooks/useDocTitle";

const log = createLogger("components");

const ComponentsPage = () => {
  const { etkeccAdmin } = useAppContext();
  const icfg = useInstanceConfig();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const locale = useLocale();
  const translate = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [sections, setSections] = useState<ComponentSection[]>([]);
  const [noSectionItems, setNoSectionItems] = useState<Component[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [toggledOff, setToggledOff] = useState<Set<string>>(new Set()); // active comps to remove
  const [toggledOn, setToggledOn] = useState<Set<string>>(new Set()); // unavailable comps to add
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<SupportRequest | null>(null);
  const [sessionRequestId, setSessionRequestId] = useState<number | null>(null);

  useDocTitle(translate("etkecc.components.name"));

  useEffect(() => {
    if (!etkeccAdmin) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dataProvider.getComponents(etkeccAdmin, locale);
        setSections(response.sections);
        setNoSectionItems(response.components);
        setTotalPrice(response.total_price);
        setCurrency(response.currency);
      } catch (error) {
        log.error("failed to fetch components", error);
        setFailure(error instanceof Error ? error.message : (error as string));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [etkeccAdmin, dataProvider, locale]);

  const currencySymbol = currency === "EUR" ? "€" : currency;

  // Price preview calculation.
  const allSectionItems = sections.flatMap(s => s.components);
  const addItems = allSectionItems.filter(c => !c.enabled && toggledOn.has(c.id));
  const removeItems = [
    ...noSectionItems.filter(c => c.enabled && toggledOff.has(c.id)),
    ...allSectionItems.filter(c => c.enabled && toggledOff.has(c.id)),
  ];
  // Only sections with a package price count as "activating"; toggling an item inside a
  // free section (price === 0) does not trigger a section charge.
  const activatedSections = sections.filter(
    s => !s.enabled && s.price > 0 && s.components.some(c => toggledOn.has(c.id))
  );
  const addPrice = addItems.reduce((sum, c) => {
    const inActivating = activatedSections.some(s => s.components.some(x => x.id === c.id));
    return sum + (inActivating ? 0 : c.price);
  }, 0);
  const sectionActivationPrice = activatedSections.reduce((sum, s) => sum + s.price, 0);
  const removePrice = removeItems.reduce((sum, c) => sum + c.price, 0);
  const previewPrice = totalPrice + addPrice + sectionActivationPrice - removePrice;
  const hasChanges = toggledOff.size > 0 || toggledOn.size > 0;

  const handleRequestChanges = async () => {
    if (!etkeccAdmin) return;
    setSubmitting(true);
    try {
      const compToSection = new Map<string, string>();
      sections.forEach(s => s.components.forEach(c => compToSection.set(c.id, s.name)));

      const removeList = removeItems
        .map(c => {
          const sectionName = compToSection.get(c.id);
          return `<li>${c.name}${sectionName ? ` (${sectionName})` : ""} — remove</li>`;
        })
        .join("");
      const addList = addItems
        .map(c => {
          const sectionName = compToSection.get(c.id);
          return `<li>${c.name}${sectionName ? ` (${sectionName})` : ""} — add</li>`;
        })
        .join("");
      const message = `<p>Hello,</p><p>I would like to change the following components on my server:</p><ul>${removeList}${addList}</ul><p>Thank you.</p>`;
      const created = await dataProvider.createSupportRequest(etkeccAdmin, locale, "Component changes", message);
      setSessionRequestId(created.id);
      setSubmittedRequest(created);
      setToggledOff(new Set());
      setToggledOn(new Set());
    } catch (error) {
      log.error("failed to submit component change request", error);
      notify("etkecc.components.request_failure", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // priceChip renders a price indicator for a component or section.
  // packState: "active" = pack owned (show "Available"), "inactive" = pack not yet owned
  //   (no chip by default; show primary chip only when toggled on), false = not a pack section
  // isToggledOn/Off: overrides chip color to signal pending add (primary) or remove (grayed)
  const priceChip = (
    comp: { price: number; enabled?: boolean },
    opts?: { packState?: "active" | "inactive" | false; isToggledOn?: boolean; isToggledOff?: boolean }
  ) => {
    const { packState = false, isToggledOn = false, isToggledOff = false } = opts ?? {};

    if (packState === "inactive") {
      if (!isToggledOn) return null;
      return (
        <Chip
          label={translate("etkecc.components.available_label")}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ flexShrink: 0 }}
        />
      );
    }

    let label: string;
    let defaultColor: "primary" | "success" | "default";
    let variant: "filled" | "outlined";

    if (packState === "active") {
      label = translate("etkecc.components.available_label");
      defaultColor = "primary";
      variant = "outlined";
    } else if (comp.price === 0) {
      if (comp.enabled) {
        label = translate("etkecc.components.included");
        defaultColor = "success";
        variant = "filled";
      } else {
        label = translate("etkecc.components.free_label");
        defaultColor = "success";
        variant = "outlined";
      }
    } else {
      label = `${currencySymbol}${comp.price}${translate("etkecc.components.per_month")}`;
      defaultColor = "success";
      variant = "outlined";
    }

    const chipColor = isToggledOn ? "primary" : isToggledOff ? "default" : defaultColor;

    return (
      <Chip
        label={label}
        size="small"
        variant={variant}
        color={chipColor}
        sx={{ flexShrink: 0, ...(isToggledOff && { opacity: 0.5 }) }}
      />
    );
  };

  const cardSx = (t: typeof theme) => ({
    height: "100%",
    borderRadius: 3,
    border: t.palette.mode === "dark" ? "1px solid rgba(244,147,0,0.15)" : "1px solid rgba(24,88,213,0.10)",
    background: t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(24,88,213,0.015)",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: t.palette.mode === "dark" ? "rgba(244,147,0,0.30)" : "rgba(24,88,213,0.22)",
    },
  });

  const renderCompItem = (comp: Component, showToggle: boolean, packState: "active" | "inactive" | false) => (
    <ListItem
      key={comp.id}
      disableGutters
      sx={{
        py: 0.5,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        borderRadius: 1,
        backgroundColor: toggledOn.has(comp.id) ? alpha(theme.palette.primary.main, 0.07) : "transparent",
        transition: "background-color 0.3s",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {comp.help ? (
          <Link href={"https://etke.cc" + comp.help} target="_blank" variant="body2" sx={{ wordBreak: "break-word" }}>
            {comp.name}
          </Link>
        ) : (
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {comp.name}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {priceChip(comp, {
          packState,
          isToggledOn: toggledOn.has(comp.id),
          isToggledOff: toggledOff.has(comp.id),
        })}
        {!showToggle && comp.enabled && comp.price > 0 && (
          <Chip
            label={translate("etkecc.components.included")}
            size="small"
            variant="filled"
            color="success"
            sx={{ flexShrink: 0 }}
          />
        )}
        {showToggle && comp.enabled && (
          <Switch
            size="small"
            sx={{ ml: 0.5 }}
            checked={!toggledOff.has(comp.id)}
            onChange={(_, checked) =>
              setToggledOff(prev => {
                const next = new Set(prev);
                if (checked) next.delete(comp.id);
                else next.add(comp.id);
                return next;
              })
            }
            slotProps={{
              input: {
                "aria-label": translate("etkecc.components.remove_aria", { name: comp.name }),
              },
            }}
          />
        )}
        {showToggle && !comp.enabled && (
          <Switch
            size="small"
            sx={{ ml: 0.5 }}
            checked={toggledOn.has(comp.id)}
            onChange={(_, checked) =>
              setToggledOn(prev => {
                const next = new Set(prev);
                if (checked) next.add(comp.id);
                else next.delete(comp.id);
                return next;
              })
            }
            slotProps={{
              input: {
                "aria-label": translate("etkecc.components.add_aria", { name: comp.name }),
              },
            }}
          />
        )}
      </Box>
    </ListItem>
  );

  const renderSection = (section: ComponentSection) => {
    const sectionLabel = tt(
      translate,
      `etkecc.components.section.${section.name.toLowerCase().replace(/\s+/g, "_")}`,
      section.name
    );
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={section.id}>
        <Card elevation={0} sx={cardSx}>
          <CardHeader
            title={
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
                {section.help ? (
                  <Link
                    href={"https://etke.cc" + section.help}
                    target="_blank"
                    sx={{ color: "inherit", textDecorationColor: "inherit" }}
                  >
                    {sectionLabel}
                  </Link>
                ) : (
                  sectionLabel
                )}
              </Typography>
            }
            action={section.price > 0 ? <Box sx={{ mt: 0.5 }}>{priceChip(section)}</Box> : undefined}
            sx={{ pb: section.components.length > 0 ? 0 : undefined }}
          />
          {section.components.length > 0 && (
            <CardContent sx={{ pt: 1 }}>
              <List disablePadding>
                {section.components.map(comp =>
                  renderCompItem(comp, true, section.price > 0 ? (section.enabled ? "active" : "inactive") : false)
                )}
              </List>
            </CardContent>
          )}
        </Card>
      </Grid>
    );
  };

  const renderNoSection = (items: Component[]) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }} key="__no_section__">
      <Card elevation={0} sx={cardSx}>
        <CardHeader
          title={
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              {translate("etkecc.components.no_section")}
            </Typography>
          }
          sx={{ pb: items.length > 0 ? 0 : undefined }}
        />
        {items.length > 0 && (
          <CardContent sx={{ pt: 1 }}>
            <List disablePadding>{items.map(comp => renderCompItem(comp, false, false))}</List>
          </CardContent>
        )}
      </Card>
    </Grid>
  );

  const header = (
    <>
      <Title title={translate("etkecc.components.name")} />
      <Box>
        <Typography variant="h4">
          <ExtensionIcon sx={{ verticalAlign: "middle", mr: 1 }} /> {translate("etkecc.components.name")}
        </Typography>
        <EtkeAttribution>
          <Typography variant="body1">{translate("etkecc.components.description")}</Typography>
        </EtkeAttribution>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {translate("etkecc.components.tagline")}
        </Typography>
      </Box>
    </>
  );

  if (loading) {
    return (
      <Stack spacing={3} mt={3}>
        {header}
        <Paper
          elevation={0}
          sx={t => ({
            p: 4,
            borderRadius: 3,
            textAlign: "center",
            border: t.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          })}
        >
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography color="text.secondary">{translate("etkecc.components.loading")}</Typography>
        </Paper>
      </Stack>
    );
  }

  if (failure) {
    return (
      <Stack spacing={3} mt={3}>
        {header}
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          <AlertTitle>{translate("etkecc.billing.helper.loading_failed1")}</AlertTitle>
          {translate("etkecc.billing.helper.loading_failed2")}
          <br />
          <EtkeAttribution>
            <Typography variant="body2">{translate("etkecc.billing.helper.loading_failed3")}</Typography>
            {!icfg.disabled.support && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SupportAgentIcon />}
                component={RouterLink}
                to="/support"
                sx={{ mt: 1 }}
              >
                {translate("etkecc.billing.status.issue.support_link")}
              </Button>
            )}
          </EtkeAttribution>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            {translate("etkecc.billing.helper.loading_failed4")}
            <br />
            {failure}
          </Typography>
        </Alert>
      </Stack>
    );
  }

  const hasItems = noSectionItems.length > 0 || sections.length > 0;

  return (
    <Stack spacing={3} mt={3}>
      {header}
      {hasItems && (
        <Grid container spacing={2}>
          {noSectionItems.length > 0 && renderNoSection(noSectionItems)}
          {sections.map(s => renderSection(s))}
        </Grid>
      )}
      {hasItems && (
        <Paper
          elevation={0}
          sx={t => ({
            p: 2.5,
            borderRadius: 3,
            border: t.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          })}
        >
          <Stack
            direction={isSmall ? "column" : "row"}
            justifyContent="space-between"
            alignItems={isSmall ? "flex-start" : "center"}
            gap={2}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                {translate("etkecc.components.total")}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                {hasChanges && previewPrice !== totalPrice && (
                  <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                    {currencySymbol}
                    {totalPrice}
                    {translate("etkecc.components.per_month")}
                  </Typography>
                )}
                <Typography variant="h6" fontWeight={700} color="primary">
                  {currencySymbol}
                  {hasChanges && previewPrice !== totalPrice ? previewPrice : totalPrice}
                  {translate("etkecc.components.per_month")}
                  {hasChanges && previewPrice !== totalPrice && (
                    <Chip
                      label={translate("etkecc.components.preview_label")}
                      size="small"
                      color="primary"
                      sx={{ ml: 0.5, height: 18, fontSize: "0.65rem" }}
                    />
                  )}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {hasChanges && sessionRequestId !== null && (
                <Alert
                  severity="info"
                  sx={{ py: 0, px: 1, borderRadius: 2, fontSize: "0.75rem" }}
                  action={
                    <Button
                      size="small"
                      onClick={() => redirect(`/support/${sessionRequestId}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      {translate("etkecc.components.request_already_sent_view")}
                    </Button>
                  }
                >
                  {translate("etkecc.components.request_already_sent")}
                </Alert>
              )}
              {sessionRequestId === null && (
                <Button
                  variant="contained"
                  disabled={!hasChanges || submitting}
                  onClick={handleRequestChanges}
                  sx={{ flexShrink: 0 }}
                >
                  {submitting ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  {translate(submitting ? "etkecc.components.requesting" : "etkecc.components.request_changes")}
                </Button>
              )}
            </Box>
          </Stack>
        </Paper>
      )}
      <Dialog open={submittedRequest !== null} onClose={() => setSubmittedRequest(null)} fullScreen={isSmall}>
        <DialogTitle>{translate("etkecc.components.request_sent_title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{translate("etkecc.components.request_sent_body")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmittedRequest(null)}>{translate("etkecc.components.request_sent_close")}</Button>
          <Button
            variant="contained"
            onClick={() => {
              setSubmittedRequest(null);
              redirect(`/support/${submittedRequest?.id}`);
            }}
          >
            {translate("etkecc.components.request_sent_view")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ComponentsPage;

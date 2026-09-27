import BuildIcon from "@mui/icons-material/Build";
import BusinessIcon from "@mui/icons-material/Business";
import EuroSymbolIcon from "@mui/icons-material/EuroSymbol";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import DownloadIcon from "@mui/icons-material/Download";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  Box,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Typography,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Stack } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { Link as RouterLink } from "react-router-dom";
import { useCallback, useState, useEffect } from "react";
import { Title, useDataProvider, useLocale, useNotify, useTranslate } from "react-admin";

import { EtkeAttribution } from "./EtkeAttribution";
import { CompanyDetailsDialog } from "./CompanyDetailsDialog";
import { InvoiceEmailsDialog } from "./InvoiceEmailsDialog";
import { useAppContext } from "../../Context";
import { useInstanceConfig } from "./InstanceConfig";
import { SynapseDataProvider, Payment, PaymentStatus } from "../../providers/types";
import createLogger from "../../utils/logger";
import { getTimeSince, getTimeUntil } from "../../utils/date";

const log = createLogger("billing");
import { useDocTitle } from "../hooks/useDocTitle";

const TruncatedUUID = ({ uuid }): React.ReactElement => {
  const short = `${uuid.slice(0, 8)}...${uuid.slice(-6)}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyToClipboard = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(uuid);
      setCopied(true);
    } catch {
      // clipboard write failed
    }
  };

  return (
    <Tooltip title={uuid}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {short}
        <IconButton size="small" onClick={copyToClipboard}>
          {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

const BillingPage = () => {
  const { etkeccAdmin } = useAppContext();
  const icfg = useInstanceConfig();
  const dataProvider = useDataProvider() as SynapseDataProvider;
  const notify = useNotify();
  const locale = useLocale();
  const translate = useTranslate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const [paymentsData, setPaymentsData] = useState<Payment[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const closeCompanyDialog = useCallback(() => setCompanyDialogOpen(false), []);
  const [invoiceEmailsDialogOpen, setInvoiceEmailsDialogOpen] = useState(false);
  const closeInvoiceEmailsDialog = useCallback(() => setInvoiceEmailsDialogOpen(false), []);

  useDocTitle(translate("etkecc.billing.name"));
  useEffect(() => {
    const fetchBillingData = async () => {
      if (!etkeccAdmin) return;

      try {
        setLoading(true);
        const paymentsResponse = await dataProvider.getPayments(etkeccAdmin, locale);
        setPaymentsData(paymentsResponse.payments);
        setMaintenance(paymentsResponse.maintenance);

        const status = paymentsResponse.status;
        if (status) {
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
          if (status.expected_price === 0) {
            log.warn("payment status: expected_price is 0, treating as missing data");
          } else if (new Date(status.due_at) < twoMonthsAgo) {
            log.warn("payment status: due_at is more than 2 months in the past, treating as stale data", status.due_at);
          } else if (status.overdue || status.mismatch) {
            setPaymentStatus(status);
          }
        }
      } catch (error) {
        log.error("failed to fetch billing data", error);
        setFailure(error instanceof Error ? error.message : (error as string));
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [etkeccAdmin, dataProvider, notify, locale]);

  const handleInvoiceDownload = async (transactionId: string) => {
    if (!etkeccAdmin || downloadingInvoice) return;

    try {
      setDownloadingInvoice(transactionId);
      await dataProvider.getInvoice(etkeccAdmin, locale, transactionId);
      notify("etkecc.billing.helper.download_started", { type: "info" });
    } catch (error) {
      // Use the specific error message from the dataProvider
      const errorMessage = error instanceof Error ? error.message : "Error downloading invoice";
      notify(errorMessage, { type: "error" });
      log.error("failed to download invoice", { transactionId, error });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const downloadInvoiceButton = (payment: Payment) => {
    const isInvoiceAvailable = typeof payment.invoice_id === "string" && /^[0-9]+$/.test(payment.invoice_id);

    if (!isInvoiceAvailable) {
      return (
        <Typography variant="body2" color="text.secondary">
          {translate("etkecc.billing.helper.invoice_not_available")}
        </Typography>
      );
    }

    const isDownloading = downloadingInvoice === payment.transaction_id;

    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<DownloadIcon />}
        onClick={() => handleInvoiceDownload(payment.transaction_id)}
        disabled={isDownloading}
      >
        {translate(isDownloading ? "etkecc.billing.helper.downloading" : "etkecc.billing.fields.invoice")}
      </Button>
    );
  };

  const header = (
    <>
      <Title title={translate("etkecc.billing.name")} />
      <Box>
        <Typography variant="h4">
          <PaymentIcon sx={{ verticalAlign: "middle", mr: 1 }} /> {translate("etkecc.billing.name")}
        </Typography>
        <EtkeAttribution>
          <Typography variant="body1">
            {translate("etkecc.billing.description1")}{" "}
            <Link href="https://etke.cc/help/payments/" target="_blank">
              etke.cc/help/payments
            </Link>
            .
            <br />
            {translate("etkecc.billing.description2")}
          </Typography>
          {etkeccAdmin && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<BusinessIcon />}
              onClick={() => setCompanyDialogOpen(true)}
              fullWidth={isSmall}
              sx={{ mt: 1 }}
            >
              {translate("etkecc.billing.company_details.open")}
            </Button>
          )}
        </EtkeAttribution>
        {etkeccAdmin && (
          <CompanyDetailsDialog etkeccAdmin={etkeccAdmin} open={companyDialogOpen} onClose={closeCompanyDialog} />
        )}
        {etkeccAdmin && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReceiptLongIcon />}
            onClick={() => setInvoiceEmailsDialogOpen(true)}
            fullWidth={isSmall}
            sx={{ mt: 1, ml: { sm: 1 } }}
          >
            {translate("etkecc.billing.invoice_emails.title")}
          </Button>
        )}
        {etkeccAdmin && (
          <InvoiceEmailsDialog
            etkeccAdmin={etkeccAdmin}
            open={invoiceEmailsDialogOpen}
            onClose={closeInvoiceEmailsDialog}
          />
        )}
      </Box>
    </>
  );

  if (loading) {
    return (
      <Stack spacing={3} mt={3}>
        {header}
        <Paper
          elevation={0}
          sx={theme => ({
            p: 4,
            borderRadius: 3,
            textAlign: "center",
            border: theme.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          })}
        >
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography color="text.secondary">{translate("etkecc.billing.helper.loading")}</Typography>
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

  if (maintenance) {
    return (
      <Stack spacing={3} mt={3}>
        {header}
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          <AlertTitle>{translate("etkecc.maintenance.title")}</AlertTitle>
          {translate("etkecc.maintenance.try_again")}
          <br />
          {translate("etkecc.maintenance.note")}
        </Alert>
      </Stack>
    );
  }

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);

  const renderPaymentStatusAlert = () => {
    if (!paymentStatus || (!paymentStatus.overdue && !paymentStatus.mismatch)) return null;

    const mostRecentSubscriptionPayment = paymentsData.find(p => p.is_subscription) ?? paymentsData[0];
    const mostRecentPayment = mostRecentSubscriptionPayment;
    const dueAtDate = new Date(paymentStatus.due_at);
    const isOverdue = dueAtDate <= new Date();
    const { timeI18Nkey, timeI18Nparams } = isOverdue
      ? getTimeSince(paymentStatus.due_at)
      : getTimeUntil(paymentStatus.due_at);
    const relativeTime = translate(timeI18Nkey, timeI18Nparams);
    const absoluteDueDate = dueAtDate.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const showLastPaid = mostRecentPayment && new Date(mostRecentPayment.paid_at) >= threeMonthsAgo;

    return (
      <Alert severity="warning" sx={{ borderRadius: 3 }}>
        <AlertTitle>{translate("etkecc.billing.status.issue.title")}</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {translate("etkecc.billing.status.issue.description")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 1.5 }}>
          {paymentStatus.overdue && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isOverdue
                  ? translate("etkecc.billing.status.issue.due_overdue")
                  : translate("etkecc.billing.status.issue.due_upcoming")}
              </Typography>
              <Tooltip
                title={
                  isOverdue
                    ? `${translate("etkecc.billing.status.issue.due_overdue")} ${absoluteDueDate}`
                    : absoluteDueDate
                }
              >
                <Typography variant="body2" fontWeight="medium" sx={{ cursor: "help" }}>
                  {relativeTime}
                </Typography>
              </Tooltip>
            </Box>
          )}
          {paymentStatus.mismatch && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {translate("etkecc.billing.status.issue.expected")}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {mostRecentPayment
                  ? formatCurrency(paymentStatus.expected_price, mostRecentPayment.currency)
                  : paymentStatus.expected_price}
              </Typography>
            </Box>
          )}
          {paymentStatus.mismatch && showLastPaid && mostRecentPayment && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {translate("etkecc.billing.status.issue.last_paid")}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(mostRecentPayment.amount, mostRecentPayment.currency)}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, flexWrap: "wrap", gap: 1 }}>
          {paymentStatus.overdue && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<BuildIcon />}
              fullWidth={isSmall}
              component={Link}
              href="https://etke.cc/help/payments/#how-to-fix-a-failing-subscription"
              target="_blank"
            >
              {translate("etkecc.billing.status.issue.fix_link")}
            </Button>
          )}
          {paymentStatus.mismatch && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EuroSymbolIcon />}
              fullWidth={isSmall}
              component={Link}
              href="https://etke.cc/help/payments/#how-to-update-your-subscription-price"
              target="_blank"
            >
              {translate("etkecc.billing.status.issue.fix_mismatch_link")}
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<SupportAgentIcon />}
            fullWidth={isSmall}
            component={RouterLink}
            to="/support"
          >
            {translate("etkecc.billing.status.issue.support_link")}
          </Button>
        </Box>
      </Alert>
    );
  };

  return (
    <Stack spacing={3} mt={3}>
      {header}
      {renderPaymentStatusAlert()}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {translate("etkecc.billing.title")}
        </Typography>
        {paymentsData.length === 0 ? (
          <Typography variant="body1">
            {translate("etkecc.billing.no_payments")}
            <EtkeAttribution>
              <Typography>{translate("etkecc.billing.no_payments_helper")}</Typography>
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
          </Typography>
        ) : isSmall ? (
          <List disablePadding>
            {paymentsData.map(payment => (
              <ListItem
                key={payment.transaction_id}
                component={Paper}
                elevation={2}
                sx={{
                  mb: 1,
                  p: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatCurrency(payment.amount, payment.currency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(payment.paid_at).toLocaleDateString(locale)}
                    {" · "}
                    {translate(`etkecc.billing.enums.type.${payment.is_subscription ? "subscription" : "one_time"}`)}
                  </Typography>
                  <Chip label={payment.email} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                </Box>
                <Box>{downloadInvoiceButton(payment)}</Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{translate("etkecc.billing.fields.transaction_id")}</TableCell>
                  <TableCell>{translate("etkecc.billing.fields.email")}</TableCell>
                  <TableCell>{translate("etkecc.billing.fields.type")}</TableCell>
                  <TableCell>{translate("etkecc.billing.fields.amount")}</TableCell>
                  <TableCell>{translate("etkecc.billing.fields.paid_at")}</TableCell>
                  <TableCell>{translate("etkecc.billing.helper.download_invoice")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentsData.map(payment => (
                  <TableRow key={payment.transaction_id}>
                    <TableCell>
                      <TruncatedUUID uuid={payment.transaction_id} />
                    </TableCell>
                    <TableCell>{payment.email}</TableCell>
                    <TableCell>
                      {translate(`etkecc.billing.enums.type.${payment.is_subscription ? "subscription" : "one_time"}`)}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell>{new Date(payment.paid_at).toLocaleDateString(locale)}</TableCell>
                    <TableCell>{downloadInvoiceButton(payment)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Stack>
  );
};

export default BillingPage;

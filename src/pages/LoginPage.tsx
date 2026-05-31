import TranslateIcon from "@mui/icons-material/Translate";
import { Avatar, Box, Card, CircularProgress, MenuItem, Select } from "@mui/material";
import { useState, useEffect } from "react";
import {
  Form,
  FormDataConsumer,
  Notification,
  useLogin,
  useNotify,
  useLocaleState,
  useTranslate,
  useLocales,
} from "react-admin";

import { useAppContext } from "../Context";
import { EtkeAttribution } from "../components/etke.cc/EtkeAttribution";
import { useInstanceConfig } from "../components/etke.cc/InstanceConfig";
import { Footer, LoginFormBox } from "../components/layout";
import { LoginButtons } from "../components/login/LoginButtons";
import { LoginFormSections } from "../components/login/LoginFormSections";
import { LoginMethod } from "../components/login/types";
import { useLoginProbe } from "../components/login/useLoginProbe";
import createLogger from "../utils/logger";

const log = createLogger("login");

/**
 * Get restricted base URL(s) from app context
 * @returns tuple of (single URL or null, array of URLs or null)
 */
function useRestrictedBaseUrl(): [string | null, string[] | null] {
  const { restrictBaseUrl } = useAppContext();
  // no var set, allow any
  if (!restrictBaseUrl) {
    return [null, null];
  }
  if (typeof restrictBaseUrl === "string") {
    // empty string means allow any
    if (restrictBaseUrl === "") {
      return [null, null];
    }

    // any other string means single url
    return [restrictBaseUrl, null];
  }

  if (Array.isArray(restrictBaseUrl)) {
    // empty array means allow any
    if (restrictBaseUrl.length === 0) {
      return [null, null];
    }
    let items = restrictBaseUrl.filter(item => item && item.trim() !== "");
    items = Array.from(new Set(items)); // deduplicate
    // after filtering, empty array means allow any
    if (items.length === 0) {
      return [null, null];
    }

    // array with one element means single url
    if (items.length === 1) {
      return [items[0], null];
    }
    // array with multiple elements means multiple urls
    return [null, items];
  }

  // fallback to any
  return [null, null];
}

const LoginPage = () => {
  const login = useLogin();
  const notify = useNotify();
  const [restrictBaseUrlSingle, restrictBaseUrlMultiple] = useRestrictedBaseUrl();
  const baseUrlChoices = restrictBaseUrlMultiple ? restrictBaseUrlMultiple : [];
  const localStorageBaseUrl = localStorage.getItem("base_url");
  let base_url = restrictBaseUrlSingle
    ? restrictBaseUrlSingle
    : restrictBaseUrlMultiple
      ? restrictBaseUrlMultiple[0]
      : null;
  if (!base_url) {
    if (localStorageBaseUrl && restrictBaseUrlMultiple?.includes(localStorageBaseUrl)) {
      // set base_url if it is in the restrictBaseUrl array
      base_url = localStorageBaseUrl;
    }
  }
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useLocaleState();
  const locales = useLocales();
  const translate = useTranslate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("credentials");
  const loginToken = new URLSearchParams(window.location.search).get("loginToken");

  // base_url, when present, seeds one probe on mount (restrictBaseUrlSingle or a
  // restored localStorage value). The probe lifecycle lives entirely in the hook.
  const { state: probeState, start } = useLoginProbe(base_url || undefined);

  useEffect(() => {
    if (!loginToken) {
      return;
    }

    // Prevent further requests
    const previousUrl = new URL(window.location.toString());
    previousUrl.searchParams.delete("loginToken");
    window.history.replaceState({}, "", previousUrl.toString());
    const sso_base_url = localStorage.getItem("sso_base_url");
    localStorage.removeItem("sso_base_url");
    if (sso_base_url) {
      const auth = {
        base_url: sso_base_url,
        username: null,
        password: null,
        loginToken,
      };
      login(auth).catch(error => {
        alert(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
              ? "ra.auth.sign_in_error"
              : error.message
        );
        log.error("login with token failed", error);
      });
    }
  }, [loginToken, login]);

  const handleSubmit = (auth: { base_url?: string; [key: string]: unknown }) => {
    setLoading(true);
    // Strip the query string (mirrors the loginToken handler's URL handling):
    // String.replace would mangle the URL if the search string recurred elsewhere.
    const cleanUrl = new URL(window.location.toString());
    cleanUrl.search = "";
    window.history.replaceState({}, "", cleanUrl.toString());

    // When a probe has resolved, submit against its well-known-resolved url;
    // otherwise fall through to whatever the form holds.
    const resolvedBaseUrl = probeState.tag === "ready" ? probeState.url : auth.base_url;
    const authWithResolved = {
      ...auth,
      base_url: resolvedBaseUrl,
    };

    login(authWithResolved).catch(error => {
      setLoading(false);
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
            ? "ra.auth.sign_in_error"
            : error.message,
        { type: "warning" }
      );
    });
  };

  const icfg = useInstanceConfig();
  let welcomeTo = "Ketesa";
  let logoUrl = "./images/logo.webp";
  let backgroundUrl = "";
  if (icfg.name) {
    welcomeTo = icfg.name;
  }
  if (icfg.logo_url) {
    logoUrl = icfg.logo_url;
  }
  if (icfg.background_url) {
    backgroundUrl = icfg.background_url;
  }

  return (
    <Form defaultValues={{ base_url: base_url }} onSubmit={handleSubmit} mode="onBlur">
      <LoginFormBox backgroundUrl={backgroundUrl}>
        {!backgroundUrl && (
          <>
            <div className="login-orb login-orb-1" />
            <div className="login-orb login-orb-2" />
            <div className="login-orb login-orb-3" />
          </>
        )}
        <Card className="card">
          <Box className="avatar">
            {loading ? (
              <CircularProgress size={80} thickness={3} />
            ) : (
              <Avatar sx={{ width: { xs: "80px", sm: "120px" }, height: { xs: "80px", sm: "120px" } }} src={logoUrl} />
            )}
          </Box>
          <Box className="hint">{translate("ketesa.auth.welcome", { name: welcomeTo })}</Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              color: "text.secondary",
              fontSize: "0.85rem",
              mt: -1,
              mb: 1.5,
              px: 2,
              textAlign: "center",
            }}
          >
            {translate("ketesa.auth.description")}
          </Box>
          <Box className="form">
            <FormDataConsumer>
              {({ formData }) => (
                <LoginFormSections
                  formData={formData}
                  probeState={probeState}
                  loginMethod={loginMethod}
                  setLoginMethod={setLoginMethod}
                  loading={loading}
                  restrictBaseUrlSingle={restrictBaseUrlSingle}
                  restrictBaseUrlMultiple={restrictBaseUrlMultiple}
                  baseUrlChoices={baseUrlChoices}
                  start={start}
                />
              )}
            </FormDataConsumer>
            <LoginButtons probeState={probeState} loginMethod={loginMethod} loading={loading} />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 0.5,
              pb: 2,
              opacity: 0.6,
              "&:hover": { opacity: 0.85 },
              transition: "opacity 150ms ease",
            }}
          >
            <TranslateIcon sx={{ fontSize: "0.95rem", color: "text.secondary" }} />
            <Select
              variant="standard"
              value={locale}
              onChange={e => setLocale(e.target.value)}
              disabled={loading}
              disableUnderline
              sx={{
                fontSize: "0.8rem",
                color: "text.secondary",
                "& .MuiSelect-select": { py: 0 },
                "& .MuiSvgIcon-root": { color: "text.secondary", fontSize: "1rem" },
              }}
            >
              {locales.map(l => (
                <MenuItem key={l.locale} value={l.locale} dense>
                  {l.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Card>
      </LoginFormBox>
      <Notification />
      <EtkeAttribution>
        <Footer />
      </EtkeAttribution>
    </Form>
  );
};

export default LoginPage;

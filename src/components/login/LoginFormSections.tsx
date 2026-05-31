import { useEffect, useRef } from "react";
import { Box, Collapse, Tab, Tabs, Typography } from "@mui/material";
import { PasswordInput, required, SelectInput, TextInput, useTranslate } from "react-admin";
import { useFormContext } from "react-hook-form";

import { getWellKnownUrl, isValidBaseUrl, splitMxid } from "../../providers/matrix";
import { GetConfig } from "../../utils/config";

import { LoginMethod, ProbeState } from "./types";
import { prependDefaultProtocol } from "./urls";
import { UseLoginProbe } from "./useLoginProbe";

interface LoginFormSectionsProps {
  formData: { base_url?: string; username?: string };
  probeState: ProbeState;
  loginMethod: LoginMethod;
  setLoginMethod: (method: LoginMethod) => void;
  loading: boolean;
  restrictBaseUrlSingle: string | null;
  restrictBaseUrlMultiple: string[] | null;
  baseUrlChoices: string[];
  start: UseLoginProbe["start"];
}

/**
 * The login form body: the credentials/access-token tabs, the homeserver URL
 * field, the server-state hints, and the username/password (or access-token)
 * inputs. The username/password inputs render whenever the credentials tab is
 * active — never gated on the probe result — so they are present in the DOM
 * regardless of probe timing. That is the keyboard-trap fix: Tab always reaches
 * them. They are merely disabled once a resolved server is known not to accept
 * password auth (and stay enabled while resolving, for autofill compatibility).
 */
export const LoginFormSections = ({
  formData,
  probeState,
  loginMethod,
  setLoginMethod,
  loading,
  restrictBaseUrlSingle,
  restrictBaseUrlMultiple,
  baseUrlChoices,
  start,
}: LoginFormSectionsProps) => {
  const translate = useTranslate();
  const form = useFormContext();
  const hasInitializedUrlParams = useRef(false);
  const wellKnownControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => wellKnownControllerRef.current?.abort(), []);

  const validateBaseUrl = (value: string) => {
    if (!value.match(/^(https?):\/\//)) {
      return translate("ketesa.auth.protocol_error");
    } else if (!isValidBaseUrl(value)) {
      return translate("ketesa.auth.url_error");
    }
    return undefined;
  };

  const handleUsernameChange = async () => {
    if (formData.base_url || restrictBaseUrlSingle) {
      return;
    }
    // If the username is a full MXID, derive the homeserver from its domain.
    const domain = splitMxid(formData.username ?? "")?.domain;
    if (domain) {
      const wellKnownDiscovery = GetConfig().wellKnownDiscovery ?? true;
      let url: string;
      if (wellKnownDiscovery) {
        // Abort an earlier in-flight lookup and bail if this one is cancelled on
        // unmount, so we never setValue on a dead form.
        wellKnownControllerRef.current?.abort();
        const controller = new AbortController();
        wellKnownControllerRef.current = controller;
        url = await getWellKnownUrl(domain, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
      } else {
        url = `https://${domain}`;
      }
      if (!restrictBaseUrlMultiple || restrictBaseUrlMultiple.includes(url)) {
        form.setValue("base_url", url, { shouldValidate: true, shouldDirty: true });
        start(url);
      }
    }
  };

  const handleBaseUrlBlurOrChange = (event?: { target?: { value?: string } }) => {
    // onChange passes the event; onBlur falls back to the current form value.
    let value = event?.target?.value || formData.base_url;
    if (!value) {
      return;
    }

    if (!value.match(/^https?:\/\//)) {
      value = prependDefaultProtocol(value);
      if (!restrictBaseUrlMultiple && !restrictBaseUrlSingle) {
        form.setValue("base_url", value, { shouldValidate: true, shouldDirty: true });
      }
    }

    form.trigger("base_url");
    // Only sync the field to the well-known-resolved url when the user owns the
    // field (free-text mode); fixed/choice modes keep their configured value.
    const onResolved =
      restrictBaseUrlMultiple || restrictBaseUrlSingle
        ? undefined
        : (nextUrl: string) => form.setValue("base_url", nextUrl, { shouldValidate: true, shouldDirty: true });
    start(value, onResolved);
  };

  useEffect(() => {
    if (hasInitializedUrlParams.current) return;
    hasInitializedUrlParams.current = true;

    // Defer to ensure the form is initialized before seeding from URL params.
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const hostname = window.location.hostname;
      const username = params.get("username");
      const password = params.get("password");
      const accessToken = params.get("accessToken");
      let serverURL = params.get("server");

      if (username) {
        form.setValue("username", username);
      }

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        if (password) {
          form.setValue("password", password);
        }
        if (accessToken) {
          setLoginMethod("accessToken");
          form.setValue("accessToken", accessToken);
        }
      }

      if (serverURL) {
        if (!serverURL.match(/^(http|https):\/\//)) {
          serverURL = prependDefaultProtocol(serverURL);
        }
        form.setValue("base_url", serverURL, { shouldValidate: true, shouldDirty: true });
        const onResolved =
          restrictBaseUrlMultiple || restrictBaseUrlSingle
            ? undefined
            : (nextUrl: string) => form.setValue("base_url", nextUrl, { shouldValidate: true, shouldDirty: true });
        start(serverURL, onResolved);
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time URL-param seeding on mount
  }, []);

  // Disable inputs when a resolved server will not accept password sign-in —
  // either it advertises no password flow, or it asks OIDC-aware clients to
  // suppress password (suppressPassword). This mirrors the Sign-in button's
  // disabled logic, so the "password isn't available" notice never sits above
  // a still-usable field.
  // Error states (unreachable/incompatible) keep inputs enabled so the user can
  // correct the URL without the fields dropping out of tab order — disabling
  // them there would reintroduce a narrower version of the keyboard trap.
  const inputsDisabled =
    loading || (probeState.tag === "ready" && (!probeState.caps.password || probeState.caps.suppressPassword));

  // When the credential fields go disabled, clear any stale required-validation
  // errors left from an earlier interaction (e.g. the user focused username,
  // blurred it empty, then entered a server that does not accept password) —
  // otherwise a greyed-out field keeps showing a red "required" message.
  useEffect(() => {
    if (inputsDisabled) {
      form.clearErrors(["username", "password"]);
    }
    // form (react-hook-form's methods) is stable in identity; only re-run when
    // the disabled state toggles, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsDisabled]);

  const serverVersionText =
    probeState.tag === "ready" && probeState.caps.serverVersion
      ? `${translate("ketesa.auth.server_version")} ${probeState.caps.serverVersion}`
      : "";
  const matrixVersionsText =
    probeState.tag === "ready" && probeState.caps.matrixVersions.length > 0
      ? `${translate("ketesa.auth.supports_specs")} ${probeState.caps.matrixVersions.join(", ")}`
      : "";

  // Retain the last advertised flows so the "incompatible" message can animate
  // out smoothly — the Collapse keeps its child mounted through the exit
  // transition, by which point probeState no longer carries advertisedFlows.
  const lastFlowsRef = useRef("");
  if (probeState.tag === "incompatible") {
    lastFlowsRef.current = probeState.advertisedFlows.join(", ");
  }

  return (
    <>
      <Tabs
        value={loginMethod}
        onChange={(_, newValue) => setLoginMethod(newValue as LoginMethod)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab label={translate("ketesa.auth.credentials")} value="credentials" />
        <Tab label={translate("ketesa.auth.access_token")} value="accessToken" />
      </Tabs>
      <Box>
        {restrictBaseUrlMultiple && (
          <SelectInput
            source="base_url"
            label="ketesa.auth.base_url"
            select={true}
            autoComplete="url"
            fullWidth
            {...(loading ? { disabled: true } : {})}
            onChange={handleBaseUrlBlurOrChange}
            validate={[required(), validateBaseUrl]}
            choices={baseUrlChoices}
          />
        )}
        {!restrictBaseUrlSingle && !restrictBaseUrlMultiple && (
          <TextInput
            source="base_url"
            label="ketesa.auth.base_url"
            autoComplete="url"
            fullWidth
            {...(loading ? { disabled: true } : {})}
            resettable={true}
            validate={[required(), validateBaseUrl]}
            onBlur={handleBaseUrlBlurOrChange}
          />
        )}
      </Box>
      {/* One persistent aria-live region wraps the animated status messages, so a
          screen reader announces every probe-state change — including the same
          error twice in a row — reliably. Per-message role/aria-live is dropped
          to avoid nested live regions reading the text twice. */}
      <Box aria-live="polite">
        <Collapse in={probeState.tag === "resolving"} unmountOnExit>
          <Typography className="serverState" color="text.secondary" sx={{ wordBreak: "break-word" }}>
            {translate("ketesa.auth.server_state.resolving")}
          </Typography>
        </Collapse>
        <Collapse in={probeState.tag === "unreachable"} unmountOnExit>
          <Typography className="serverState" color="error" sx={{ wordBreak: "break-word" }}>
            {translate("ketesa.auth.server_state.unreachable")}
          </Typography>
        </Collapse>
        <Collapse in={probeState.tag === "incompatible"} unmountOnExit>
          <Typography className="serverState" color="error" sx={{ wordBreak: "break-word" }}>
            {translate("ketesa.auth.server_state.incompatible", { flows: lastFlowsRef.current })}
          </Typography>
        </Collapse>
        <Collapse in={probeState.tag === "ready" && probeState.caps.suppressPassword} unmountOnExit>
          <Typography className="serverState" color="text.secondary" sx={{ wordBreak: "break-word" }}>
            {translate("ketesa.auth.server_state.suppress_password_notice")}
          </Typography>
        </Collapse>
      </Box>
      {loginMethod === "credentials" && (
        <>
          <Box>
            <TextInput
              source="username"
              label="ra.auth.username"
              autoComplete="username"
              fullWidth
              onBlur={handleUsernameChange}
              resettable
              validate={required()}
              {...(inputsDisabled ? { disabled: true } : {})}
            />
          </Box>
          <Box>
            <PasswordInput
              source="password"
              label="ra.auth.password"
              type="password"
              autoComplete="current-password"
              fullWidth
              {...(inputsDisabled ? { disabled: true } : {})}
              resettable
              validate={required()}
            />
          </Box>
        </>
      )}
      {loginMethod === "accessToken" && (
        <Box>
          <TextInput
            source="accessToken"
            label="ketesa.auth.access_token"
            fullWidth
            {...(loading ? { disabled: true } : {})}
            resettable
            validate={required()}
          />
        </Box>
      )}
      <Collapse in={!!serverVersionText || !!matrixVersionsText} unmountOnExit>
        <Box>
          {serverVersionText && (
            <Typography className="serverVersion" sx={{ wordBreak: "break-word" }}>
              {serverVersionText}
            </Typography>
          )}
          {matrixVersionsText && (
            <Typography className="matrixVersions" sx={{ wordBreak: "break-word" }}>
              {matrixVersionsText}
            </Typography>
          )}
        </Box>
      </Collapse>
    </>
  );
};

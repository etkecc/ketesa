import { Button, CardActions } from "@mui/material";
import { useLogin, useTranslate } from "react-admin";

import createLogger from "../../utils/logger";

import { LoginMethod, ProbeState } from "./types";

const log = createLogger("login-buttons");

interface LoginButtonsProps {
  probeState: ProbeState;
  loginMethod: LoginMethod;
  loading: boolean;
}

/**
 * The login action buttons. The password Sign-in renders whenever the
 * credentials tab is active but stays disabled until a probe has resolved a
 * server that accepts password auth, so it can never submit before the server's
 * capabilities are known. SSO and OIDC buttons appear only once their capability
 * is confirmed on a resolved server.
 */
export const LoginButtons = ({ probeState, loginMethod, loading }: LoginButtonsProps) => {
  const translate = useTranslate();
  const login = useLogin();

  const handleSSO = () => {
    if (probeState.tag !== "ready") {
      return;
    }
    const { ssoBaseUrl } = probeState.caps;
    localStorage.setItem("sso_base_url", ssoBaseUrl);
    // Return to the bare login page after SSO, origin + pathname only, matching
    // handleOIDC. The full href would leak any query params (and a racing
    // loginToken) to the homeserver's SSO endpoint via the redirectUrl.
    const redirectUrl = window.location.origin + window.location.pathname;
    const ssoFullUrl = `${ssoBaseUrl}/_matrix/client/v3/login/sso/redirect?redirectUrl=${encodeURIComponent(
      redirectUrl
    )}`;
    window.location.href = ssoFullUrl;
  };

  const handleOIDC = () => {
    if (probeState.tag !== "ready") {
      return;
    }
    log.debug("OIDC login initiated", { baseUrl: probeState.url });
    login({
      base_url: probeState.url,
      clientUrl: window.location.origin + window.location.pathname,
      authMetadata: probeState.caps.authMetadata,
    });
  };

  if (loginMethod === "accessToken") {
    return (
      <CardActions className="actions">
        <Button variant="contained" type="submit" color="primary" disabled={loading} fullWidth>
          {translate("ra.auth.sign_in")}
        </Button>
      </CardActions>
    );
  }

  const ready = probeState.tag === "ready";
  const caps = ready ? probeState.caps : null;
  // Show the password Sign-in until a resolved server is known NOT to accept
  // password; then hide it, so OIDC-only servers don't show a permanently-dead
  // control (better a11y than a never-enabling disabled button).
  const showSignIn = !ready || !!caps?.password;
  const signInDisabled = loading || !caps || !caps.password || caps.suppressPassword;

  return (
    <CardActions className="actions" sx={{ flexDirection: "column", gap: 1, "& > :not(:first-of-type)": { ml: 0 } }}>
      {showSignIn && (
        <Button variant="contained" type="submit" color="primary" disabled={signInDisabled} fullWidth>
          {probeState.tag === "resolving"
            ? translate("ketesa.auth.server_state.checking")
            : translate("ra.auth.sign_in")}
        </Button>
      )}
      {/* Suppress SSO only when OIDC is the live alternative (caps.oidc): a server
          that asks to suppress password but advertises no usable OIDC issuer would
          otherwise leave the card with no actionable button at all; SSO is the
          fallback path there. */}
      {caps && caps.sso && (!caps.suppressPassword || !caps.oidc) && (
        <Button variant="contained" color="secondary" onClick={handleSSO} disabled={loading} fullWidth>
          {translate("ketesa.auth.sso_sign_in")}
        </Button>
      )}
      {caps && caps.oidc && (
        // Only when a usable issuer is confirmed (caps.oidc): a server can claim
        // suppressPassword without a valid issuer, and handleOIDC needs the metadata.
        <Button variant="contained" color="secondary" onClick={handleOIDC} disabled={loading} fullWidth>
          {translate("ketesa.auth.oidc_sign_in")}
        </Button>
      )}
    </CardActions>
  );
};

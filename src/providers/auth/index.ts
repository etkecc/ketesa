import { UserManager } from "oidc-client-ts";
import { AuthProvider, HttpError, Options, fetchUtils } from "react-admin";

import createLogger from "../../utils/logger";

const log = createLogger("auth");

import { AuthMetadata, getAuthMetadata, handleOIDCAuth, refreshAccessToken, revokeOAuthTokens } from "../matrix";
import { detectAndSetMAS } from "../data/mas";
import { initResources } from "../data";
import { fetchServerVersions, clearServerVersions } from "../serverVersion";
import { FetchInstanceConfig, GetInstanceConfig } from "../../components/etke.cc/InstanceConfig";
import { ClearConfig, FetchWellKnownConfig, GetConfig, SetExternalAuthProvider } from "../../utils/config";
import { decodeURLComponent } from "../../utils/safety";
import { MatrixError, displayError } from "../../utils/error";
import { fetchAuthenticatedMedia } from "../../utils/fetchMedia";

const authProvider: AuthProvider = {
  // called when the user attempts to log in
  login: async ({
    base_url,
    username,
    password,
    loginToken,
    accessToken,
    clientUrl,
    authMetadata,
  }: {
    base_url: string;
    username: string;
    password: string;
    loginToken: string;
    accessToken: string;
    clientUrl: string;
    authMetadata: AuthMetadata;
  }) => {
    // Uses the login form's base_url so the admin can reach the admin API on a private address.
    if (!base_url) {
      // Guards a bug where base_url is present in the form but not submitted (etkecc/ketesa#14).
      localStorage.removeItem("base_url");
      throw new Error("Homeserver URL is required.");
    }
    base_url = base_url.replace(/\/+$/g, "");
    localStorage.setItem("base_url", base_url);

    log.info("login", {
      base_url,
      method: clientUrl && authMetadata ? "oidc" : loginToken ? "token" : accessToken ? "access_token" : "password",
    });

    const decoded_base_url = decodeURLComponent(base_url);
    localStorage.setItem("decoded_base_url", decoded_base_url);

    if (clientUrl && authMetadata) {
      // this is a OIDC login
      const authParams = await handleOIDCAuth(authMetadata, clientUrl);
      const userManager = new UserManager({
        authority: authParams.issuer,
        client_id: authParams.clientId,
        redirect_uri: authParams.redirectUri,
        response_type: authParams.responseType,
        scope: authParams.scope,
      });

      await userManager.signinRedirect();
      return;
    }

    // Left over from an OIDC login that wasn't finished; this session ends with /logout.
    localStorage.removeItem("revocation_endpoint");

    const config = GetConfig();
    const icfg = GetInstanceConfig();
    let deviceName = "Ketesa";
    if (icfg.name) {
      deviceName = icfg.name;
    }

    let options: Options = {
      method: "POST",
      credentials: config.corsCredentials as RequestCredentials,
      headers: new Headers({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(
        Object.assign(
          {
            device_id: localStorage.getItem("device_id"),
            initial_device_display_name: deviceName,
          },
          loginToken
            ? {
                type: "m.login.token",
                token: loginToken,
              }
            : {
                type: "m.login.password",
                identifier: {
                  type: "m.id.user",
                  user: username,
                },
                password: password,
              }
        )
      ),
    };

    const login_api_url =
      decoded_base_url + (accessToken ? "/_matrix/client/v3/account/whoami" : "/_matrix/client/v3/login");

    let response;

    try {
      if (accessToken) {
        // this a login with an already obtained access token, let's just validate it
        options = {
          headers: new Headers({
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          }),
        };
      }

      response = await fetchUtils.fetchJson(login_api_url, options);
      const json = response.json;

      // split(":")[1] fails on hosts with ports or IPv6; home_server is deprecated, so extract from user_id.
      const mxidParts = json.user_id?.split(":");
      mxidParts?.shift();
      const homeServer = mxidParts?.join(":");
      if (!homeServer) {
        throw new Error(`Cannot determine home_server from user_id: ${json.user_id}`);
      }
      localStorage.setItem("home_server", homeServer);
      localStorage.setItem("user_id", json.user_id);
      localStorage.setItem("access_token", accessToken ? accessToken : json.access_token);
      localStorage.setItem("device_id", json.device_id);
      localStorage.setItem("login_type", accessToken ? "accessToken" : "credentials");
      let pageToRedirectTo = "/";

      await FetchWellKnownConfig();
      const cfg = GetConfig();
      if (cfg.etkeccAdmin) {
        await FetchInstanceConfig(cfg.etkeccAdmin, "");
      }
      const updatedIcfg = GetInstanceConfig();

      if (cfg.etkeccAdmin && updatedIcfg && !updatedIcfg.disabled.monitoring) {
        pageToRedirectTo = "/server_status";
      }

      if (accessToken) {
        const accessTokenAuthMetadata = authMetadata ?? (await getAuthMetadata(decoded_base_url));

        if (accessTokenAuthMetadata?.token_endpoint) {
          localStorage.setItem("token_endpoint", accessTokenAuthMetadata.token_endpoint);
        } else {
          localStorage.removeItem("token_endpoint");
        }
      }

      await detectAndSetMAS();
      initResources();
      fetchServerVersions();
      return Promise.resolve({ redirectTo: pageToRedirectTo });
    } catch (err) {
      const error = err as HttpError;
      const errorStatus = error.status;
      const errorBody = error.body as MatrixError;
      const errMsg = errorBody?.errcode
        ? displayError(errorBody.errcode, errorStatus, errorBody.error)
        : displayError("M_INVALID", errorStatus, error.message);

      return Promise.reject(new HttpError(errMsg, errorStatus));
    }
  },
  getIdentity: async () => {
    const access_token = localStorage.getItem("access_token");
    const user_id = localStorage.getItem("user_id");
    const base_url = localStorage.getItem("base_url");

    if (typeof access_token !== "string" || typeof user_id !== "string" || typeof base_url !== "string") {
      return Promise.reject();
    }

    const options: Options = {
      headers: new Headers({
        Accept: "application/json",
        Authorization: `Bearer ${access_token}`,
      }),
    };

    const whoami_api_url = base_url + `/_matrix/client/v3/profile/${user_id}`;

    try {
      let avatar_url = "";
      const response = await fetchUtils.fetchJson(whoami_api_url, options);
      if (response.json.avatar_url) {
        const mediaresp = await fetchAuthenticatedMedia(response.json.avatar_url, "thumbnail");
        const blob = await mediaresp.blob();
        avatar_url = URL.createObjectURL(blob);
      }

      return Promise.resolve({
        id: user_id,
        fullName: response.json.displayname,
        avatar: avatar_url,
      });
    } catch (err) {
      log.error("getIdentity failed", err);
      return Promise.reject();
    }
  },
  handleCallback: async () => {
    log.debug("handleCallback start");
    const clientId = localStorage.getItem("clientId");
    const issuer = localStorage.getItem("oidc_issuer");
    const scope = localStorage.getItem("oidc_scope") || "openid";
    const redirectUri = localStorage.getItem("oidc_redirect_uri") || `${window.location.origin}/auth-callback/`;

    if (!clientId || !issuer) {
      log.error("handleCallback: missing OIDC config in storage", { hasClientId: !!clientId, hasIssuer: !!issuer });
      return Promise.reject(new Error("Missing OAuth configuration"));
    }

    const userManager = new UserManager({
      authority: issuer,
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
    });

    const user = await userManager.signinRedirectCallback(window.location.href);

    // Save tokens to localStorage
    const { access_token, refresh_token, id_token, expires_in } = user;

    if (!access_token) {
      throw new Error("Missing access token in callback response");
    }

    localStorage.setItem("access_token", access_token);

    if (refresh_token) {
      SetExternalAuthProvider(true); // refresh token is only present for external auth providers
      localStorage.setItem("refresh_token", refresh_token);
    }

    if (id_token) {
      localStorage.setItem("id_token", id_token);
    }

    // Save token expiration time
    if (expires_in) {
      const expiresAt = Date.now() + expires_in * 1000;
      localStorage.setItem("access_token_expires_at", expiresAt.toString());
    }

    const decoded_base_url = localStorage.getItem("decoded_base_url") || "";

    if (!decoded_base_url) {
      log.error("handleCallback: no base_url in storage");
      throw new Error("Base URL not found");
    }

    // Get user_id from whoami endpoint
    const whoamiUrl = `${decoded_base_url}/_matrix/client/v3/account/whoami`;
    try {
      const whoamiResponse = await fetchUtils.fetchJson(whoamiUrl, {
        headers: new Headers({
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
        }),
      });
      const json = whoamiResponse.json;
      const userId = json.user_id;
      const deviceId = json.device_id;

      if (!userId) {
        throw new Error("Missing user_id in whoami response");
      }

      localStorage.setItem("user_id", userId);
      if (deviceId) {
        localStorage.setItem("device_id", deviceId);
      }

      // split(":")[1] fails on hosts with ports or IPv6 addresses (e.g. "@user:example.com:8008").
      const mxidParts = userId.split(":");
      mxidParts.shift();
      localStorage.setItem("home_server", mxidParts.join(":"));
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("login_type", "credentials"); // OIDC login via an external provider

      await FetchWellKnownConfig();
      const cfg = GetConfig();
      if (cfg.etkeccAdmin) {
        await FetchInstanceConfig(cfg.etkeccAdmin, "");
      }
      const icfg = GetInstanceConfig();
      let pageToRedirectTo = "/";
      if (cfg.etkeccAdmin && icfg && !icfg.disabled.monitoring) {
        pageToRedirectTo = "/server_status";
      }

      log.info("authenticated via OIDC", { userId });
      await detectAndSetMAS();
      initResources();
      fetchServerVersions();
      return Promise.resolve({ redirectTo: pageToRedirectTo });
    } catch (err) {
      log.error("handleCallback: failed to get user info", err);
      ClearConfig();
      throw err;
    }
  },
  // called when the user clicks on the logout button
  logout: async () => {
    log.info("logout");

    const logout_api_url = localStorage.getItem("base_url") + "/_matrix/client/v3/logout";
    const access_token = localStorage.getItem("access_token");

    const options: Options = {
      method: "POST",
      credentials: GetConfig().corsCredentials as RequestCredentials,
      headers: new Headers({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      user: {
        authenticated: true,
        token: `Bearer ${access_token}`,
      },
    };

    if (typeof access_token === "string") {
      try {
        if (!(await revokeOAuthTokens())) {
          await fetchUtils.fetchJson(logout_api_url, options);
        }
      } catch (err) {
        log.warn("logout: server call failed (session cleared anyway)", err);
      } finally {
        clearServerVersions();
        ClearConfig();
      }
    }
  },
  // called when the API returns an error
  checkError: (err: HttpError) => {
    const errorBody = err.body as MatrixError;
    const status = err.status;

    if (status === 401) {
      return Promise.reject({ message: displayError(errorBody.errcode, status, errorBody.error) });
    }
    return Promise.resolve();
  },
  // called when the user navigates to a new location, to check for authentication
  checkAuth: async () => {
    const access_token = localStorage.getItem("access_token");

    if (typeof access_token !== "string") {
      return Promise.reject();
    }

    // Ensure server versions are fetched (handles page reload)
    fetchServerVersions();

    // Check if token has expired
    const expiresAt = localStorage.getItem("access_token_expires_at");
    if (expiresAt) {
      SetExternalAuthProvider(true); // presence of expiration time indicates external auth provider

      const expirationTime = parseInt(expiresAt, 10);
      const now = Date.now();

      if (now >= expirationTime) {
        log.debug("checkAuth: token expired, refreshing");

        // Attempt to refresh the token
        const refreshSuccess = await refreshAccessToken();

        if (refreshSuccess) {
          log.debug("checkAuth: token refreshed");
          return Promise.resolve();
        } else {
          log.warn("checkAuth: token refresh failed, redirecting to login");
          return Promise.reject();
        }
      }
    }

    return Promise.resolve();
  },
};

export default authProvider;

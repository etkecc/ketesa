import { DeleteParams, RaRecord, fetchUtils } from "react-admin";

import { jsonClient } from "./http";
import createLogger from "../utils/logger";

const log = createLogger("matrix");
import { Room, UploadMediaParams, UploadMediaResult } from "./types";

import { GetInstanceConfig } from "../components/etke.cc/InstanceConfig";
import { generateDeviceId } from "../utils/password";
import { encodeURLComponent } from "../utils/safety";

export const splitMxid = (mxid: string) => {
  const re = /^@(?<name>[a-zA-Z0-9._=\-/]+):(?<domain>(?:\[[\da-fA-F:]+\]|[a-zA-Z0-9\-.]+)(?::\d{1,5})?)$/;
  return re.exec(mxid)?.groups;
};

export const isValidBaseUrl = (baseUrl: unknown): boolean =>
  typeof baseUrl === "string" && /^(https?):\/\/(\[[\da-fA-F:]+\]|[a-zA-Z0-9\-.]+)(:\d{1,5})?\/?$/.test(baseUrl);

/**
 * Resolve a base URL using /.well-known/matrix/client if present.
 * Falls back to the provided URL if lookup fails or is invalid.
 */
export const resolveBaseUrlWithWellKnown = async (baseUrl: string, signal?: AbortSignal): Promise<string> => {
  if (!baseUrl) return baseUrl;
  const cleaned = baseUrl.replace(/\/+$/g, "");
  let origin: string;
  try {
    origin = new URL(cleaned).origin;
  } catch {
    return cleaned;
  }

  const wellKnownUrl = `${origin}/.well-known/matrix/client`;
  try {
    const response = await fetchUtils.fetchJson(wellKnownUrl, { method: "GET", signal });
    const wkBaseUrl = response.json?.["m.homeserver"]?.base_url;
    if (typeof wkBaseUrl === "string" && wkBaseUrl.trim() !== "") {
      const resolved = wkBaseUrl.replace(/\/+$/g, "");
      log.debug("resolved base URL via well-known", { original: baseUrl, resolved });
      return resolved;
    }
  } catch {
    // ignore and fall back to the provided URL
  }

  return cleaned;
};

/**
 * Resolve the homeserver URL using the well-known lookup
 * @param domain  the domain part of an MXID
 * @returns homeserver base URL
 */
export const getWellKnownUrl = async (domain: string, signal?: AbortSignal) => {
  const wellKnownUrl = `https://${domain}/.well-known/matrix/client`;
  try {
    const response = await fetchUtils.fetchJson(wellKnownUrl, { method: "GET", signal });
    return response.json["m.homeserver"].base_url;
  } catch {
    // if there is no .well-known entry, return the domain itself
    return `https://${domain}`;
  }
};

/** Get supported Matrix features */
export const getSupportedFeatures = async (baseUrl: string, signal?: AbortSignal) => {
  const versionUrl = `${baseUrl}/_matrix/client/versions`;
  const response = await fetchUtils.fetchJson(versionUrl, { method: "GET", signal });
  return response.json;
};

/**
 * Get supported login flows
 * @param baseUrl  the base URL of the homeserver
 * @returns array of supported login flows
 */
export const getSupportedLoginFlows = async (baseUrl: string, signal?: AbortSignal) => {
  const loginFlowsUrl = `${baseUrl}/_matrix/client/v3/login`;
  const response = await fetchUtils.fetchJson(loginFlowsUrl, { method: "GET", signal });
  return response.json.flows;
};

export const getAuthMetadata = async (baseUrl: string, signal?: AbortSignal): Promise<AuthMetadata | null> => {
  const endpoints = [
    `${baseUrl}/_matrix/client/v1/auth_metadata`, // stable (Matrix spec v1.14+)
    `${baseUrl}/_matrix/client/unstable/org.matrix.msc2965/auth_metadata`, // legacy unstable fallback
  ];
  for (const url of endpoints) {
    try {
      const response = await fetchUtils.fetchJson(url, { method: "GET", signal });
      if (response.status === 200 && response.json?.issuer) {
        return response.json;
      }
    } catch {
      // try next endpoint
    }
  }
  return null;
};

/**
 * Refresh the access token using the refresh token
 * Based on: https://github.com/authts/oidc-client-ts/blob/main/docs/protocols/refresh-token-grant.md
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem("refresh_token");
  const tokenEndpoint = localStorage.getItem("token_endpoint");
  const clientId = localStorage.getItem("clientId");

  if (!refreshToken || !tokenEndpoint || !clientId) {
    log.error("refreshAccessToken: missing credentials", {
      hasRefreshToken: !!refreshToken,
      hasTokenEndpoint: !!tokenEndpoint,
      hasClientId: !!clientId,
    });
    return false;
  }

  try {
    log.debug("refreshing access token", { tokenEndpoint });
    const tokenParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    });

    const response = await fetchUtils.fetchJson(tokenEndpoint, {
      method: "POST",
      headers: new Headers({
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: tokenParams.toString(),
    });

    const { access_token, refresh_token: new_refresh_token, id_token, expires_in } = response.json;

    // Update tokens in localStorage
    if (access_token) {
      localStorage.setItem("access_token", access_token);
      log.debug("access token refreshed", { expiresIn: expires_in });
    }

    // Some providers return a new refresh token
    if (new_refresh_token) {
      localStorage.setItem("refresh_token", new_refresh_token);
    }

    if (id_token) {
      localStorage.setItem("id_token", id_token);
    }

    // Update token expiration time
    if (expires_in) {
      const expiresAt = Date.now() + expires_in * 1000;
      localStorage.setItem("access_token_expires_at", expiresAt.toString());
    }

    return true;
  } catch (error) {
    log.error("access token refresh failed", error);
    return false;
  }
};

interface ClientRegistration {
  client_id: string;
  client_name: string;
  client_uri: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  id_token_signed_response_alg: string;
  application_type: string;
  logo_uri: string;
}

export const registerClient = async (registrationEndpoint: string, clientUrl: string): Promise<ClientRegistration> => {
  if (clientUrl.endsWith("/")) {
    clientUrl = clientUrl.slice(0, -1);
  }

  const icfg = GetInstanceConfig();
  let clientName = "Ketesa";
  let logoUri = `${clientUrl}/images/logo.webp`;
  if (icfg.name) {
    clientName = icfg.name;
  }
  if (icfg.logo_url) {
    logoUri = icfg.logo_url;
  }

  const registerOpts = {
    method: "POST",
    body: JSON.stringify({
      client_name: clientName,
      client_uri: clientUrl,
      response_types: ["code"],
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [`${clientUrl}/auth-callback/`],
      id_token_signed_response_alg: "RS256",
      token_endpoint_auth_method: "none",
      application_type: "web",
      logo_uri: logoUri,
    }),
  };
  const registerResponse = await fetchUtils.fetchJson(`${registrationEndpoint}`, registerOpts);
  const json = registerResponse.json;
  log.debug("OIDC client registered", { clientId: json.client_id, clientName });
  return json;
};

export interface AuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  response_types_supported?: string[];
  grant_types_supported?: string[];
  response_modes_supported?: string[];
  code_challenge_methods_supported?: string[];
  prompt_values_supported?: string[];
  device_authorization_endpoint?: string;
  account_management_uri?: string;
  account_management_actions_supported?: string[];
}

export interface OIDCAuthParams {
  clientId: string;
  redirectUri: string;
  issuer: string;
  scope: string;
  responseType: string;
}

export const handleOIDCAuth = async (authMetadata: AuthMetadata, clientUrl: string): Promise<OIDCAuthParams> => {
  if (!authMetadata.registration_endpoint) {
    throw new Error("Server does not support dynamic client registration");
  }
  const registrationJson = await registerClient(authMetadata.registration_endpoint, clientUrl);
  const clientId = registrationJson.client_id;

  localStorage.setItem("clientId", clientId);
  localStorage.setItem("token_endpoint", authMetadata.token_endpoint);
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem("device_id", deviceId);
  }

  const scopes = [
    "openid",
    "urn:matrix:org.matrix.msc2967.client:api:*",
    `urn:matrix:org.matrix.msc2967.client:device:${deviceId}`,
    "urn:synapse:admin:*",
    "urn:mas:admin", // Required for MAS registration tokens
  ];
  const scope = scopes.join(" ");
  localStorage.setItem("oidc_issuer", authMetadata.issuer);
  localStorage.setItem("oidc_scope", scope);
  localStorage.setItem("oidc_redirect_uri", registrationJson.redirect_uris[0]);

  return {
    clientId,
    redirectUri: registrationJson.redirect_uris[0],
    issuer: authMetadata.issuer,
    scope,
    responseType: "code",
  };
};

export const uploadMedia = async ({ file, filename, content_type }: UploadMediaParams): Promise<UploadMediaResult> => {
  const base_url = localStorage.getItem("base_url");
  const { json } = await jsonClient(`${base_url}/_matrix/media/v3/upload?filename=${encodeURLComponent(filename)}`, {
    method: "POST",
    body: file,
    headers: new Headers({
      Accept: "application/json",
      "Content-Type": content_type,
    }) as Headers,
  });
  return json as UploadMediaResult;
};

export const roomDirectoryResource = {
  path: "/_matrix/client/v3/publicRooms",
  map: (rd: Room) => ({
    ...rd,
    id: rd.room_id,
    public: !!rd.public,
    guest_access: !!rd.guest_access,
    avatar_src: rd.avatar_url ? rd.avatar_url : undefined,
  }),
  data: "chunk",
  total: (json: { total_room_count_estimate: number }) => json.total_room_count_estimate,
  create: (params: RaRecord) => ({
    endpoint: `/_matrix/client/v3/directory/list/room/${params.id}`,
    body: { visibility: "public" },
    method: "PUT",
    response: (data: RaRecord) => data,
  }),
  delete: (params: DeleteParams) => ({
    endpoint: `/_matrix/client/v3/directory/list/room/${params.id}`,
    body: { visibility: "private" },
    method: "PUT",
  }),
};

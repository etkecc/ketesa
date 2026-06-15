import { HttpError, Options, fetchUtils } from "react-admin";

import { refreshAccessToken } from "./matrix";
import { GetConfig } from "../utils/config";
import { MatrixError, displayError } from "../utils/error";
import createLogger from "../utils/logger";

const log = createLogger("http");

// Singleton refresh promise; prevents multiple concurrent refresh requests
let ongoingRefresh: Promise<boolean> | null = null;

// Adds the access token to all requests
export const jsonClient = async (url: string, options: Options = {}) => {
  // Check if token needs refresh before making the request
  const access_token_expires_at = localStorage.getItem("access_token_expires_at");
  const refreshToken = localStorage.getItem("refresh_token");

  if (access_token_expires_at && refreshToken) {
    const expiresAt = parseInt(access_token_expires_at, 10);
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh if token has expired or will expire in less than 2 minutes
    if (timeUntilExpiry < 120000) {
      log.debug("proactive token refresh", {
        status: timeUntilExpiry <= 0 ? "expired" : "expiring soon",
        timeUntilExpiry,
      });
      if (!ongoingRefresh) {
        ongoingRefresh = refreshAccessToken().finally(() => {
          ongoingRefresh = null;
        });
      }
      await ongoingRefresh;
    }
  }

  const token = localStorage.getItem("access_token");
  log.debug(url);
  options.credentials = GetConfig().corsCredentials as RequestCredentials;
  if (token !== null) {
    options.user = {
      authenticated: true,
      token: `Bearer ${token}`,
    };
  }
  try {
    const response = await fetchUtils.fetchJson(url, options);
    return response;
  } catch (err) {
    const error = err as HttpError;
    const errorStatus = error.status;
    const errorBody = error.body as MatrixError;
    const errMsg = errorBody?.errcode
      ? displayError(errorBody.errcode, errorStatus, errorBody.error)
      : displayError("M_INVALID", errorStatus, error.message);

    return Promise.reject(new HttpError(errMsg, errorStatus, errorBody));
  }
};

export const etkeClient = async (url: string, locale: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return Promise.reject(new Error("Missing access token"));
  }
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (locale) {
    headers.set("Accept-Language", locale);
  }

  return fetch(url, { ...options, headers });
};

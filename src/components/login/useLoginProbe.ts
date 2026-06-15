import { useCallback, useEffect, useReducer, useRef } from "react";

import { getServerVersion } from "../../providers/data/synapse";
import {
  AuthMetadata,
  getAuthMetadata,
  getSupportedFeatures,
  getSupportedLoginFlows,
  isValidBaseUrl,
  resolveBaseUrlWithWellKnown,
} from "../../providers/matrix";
import { GetConfig, SetExternalAuthProvider } from "../../utils/config";
import createLogger from "../../utils/logger";

import { ProbeAction, ProbeState, ServerCapabilities } from "./types";
import { isValidIssuer } from "./urls";

const log = createLogger("login-probe");

/** Per-flow flags that mark a server as delegating auth to OIDC. */
const OIDC_DELEGATION_FLAGS = ["org.matrix.msc3824.delegated_oidc_compatibility", "delegated_oidc_compatibility"];
/** Per-flow flags that ask OIDC-aware clients to suppress password sign-in (v1.18 adds oauth_aware_preferred). */
const SUPPRESS_PASSWORD_FLAGS = [...OIDC_DELEGATION_FLAGS, "oauth_aware_preferred"];

/** A login flow object with its type plus arbitrary advertised flags. */
interface LoginFlow {
  type: string;
  [key: string]: unknown;
}

/**
 * Staleness is handled in start() via the AbortController signal, so the reducer
 * only transitions on the action tag. START carries the raw url (for instant
 * "resolving" feedback) and RESOLVED carries the well-known-resolved url, so the
 * two urls legitimately differ; a url-matching guard here would reject the
 * resolved result.
 */
function probeReducer(state: ProbeState, action: ProbeAction): ProbeState {
  switch (action.type) {
    case "START":
      return { tag: "resolving", url: action.url };
    case "RESOLVED":
      return { tag: "ready", url: action.url, caps: action.caps };
    case "INCOMPATIBLE":
      return { tag: "incompatible", url: action.url, advertisedFlows: action.advertisedFlows };
    case "UNREACHABLE":
      return { tag: "unreachable", url: action.url };
    case "RESET":
      return { tag: "idle" };
    default:
      return state;
  }
}

/**
 * Derive the advertised capabilities from a resolved probe. password, sso, and
 * oidc are computed independently: a Synapse + SSO deployment advertises both
 * password and sso, and the spec allows their coexistence.
 *
 * OIDC counts as usable only with a present, well-formed issuer: a delegated-OIDC
 * signal pointing at a missing or malformed issuer is a misconfigured server, not
 * a flow we can drive (handleOIDC needs the auth metadata).
 */
function deriveCapabilities(
  url: string,
  flows: LoginFlow[],
  authMetadata: AuthMetadata | null,
  serverVersion: string,
  matrixVersions: string[]
): ServerCapabilities {
  const password = flows.some(f => f.type === "m.login.password");
  const sso = flows.some(f => f.type === "m.login.sso");
  const hasDelegatedOIDC = flows.some(f => f.type === "m.login.sso" && OIDC_DELEGATION_FLAGS.some(flag => !!f[flag]));
  const suppressPassword = flows.some(f => f.type === "m.login.sso" && SUPPRESS_PASSWORD_FLAGS.some(flag => !!f[flag]));
  const oidcUsable =
    (hasDelegatedOIDC || authMetadata?.issuer != null) && authMetadata != null && isValidIssuer(authMetadata.issuer);
  const meta = oidcUsable && authMetadata ? authMetadata : null;

  return {
    password,
    sso,
    oidc: oidcUsable,
    oidcIssuer: meta ? meta.issuer : null,
    suppressPassword,
    serverVersion,
    matrixVersions,
    authMetadata: meta,
    ssoBaseUrl: sso ? url : "",
  };
}

export interface UseLoginProbe {
  state: ProbeState;
  /**
   * Probe a homeserver. rawUrl is resolved via well-known (when enabled); if the
   * resolved url differs, onResolved is called so the caller can sync its form
   * field. A previous in-flight probe is aborted first.
   */
  start: (rawUrl: string, onResolved?: (resolvedUrl: string) => void) => void;
  /** Cancel any in-flight probe and return to idle. */
  abort: () => void;
}

/**
 * Owns the homeserver-probe lifecycle: one AbortController-managed probe at a
 * time, the result reduced into a ProbeState the login form renders from. Input
 * visibility never depends on probe resolution timing, which is what fixes the
 * keyboard trap. An optional initialUrl fires one probe on mount (replacing the
 * previous on-mount effect for restrictBaseUrlSingle / restored base_url).
 */
export function useLoginProbe(initialUrl?: string): UseLoginProbe {
  const [state, dispatch] = useReducer(probeReducer, { tag: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback((rawUrl: string, onResolved?: (resolvedUrl: string) => void) => {
    if (!rawUrl) {
      return;
    }
    if (!isValidBaseUrl(rawUrl)) {
      // Invalid input clears the probe; the form's own validator shows the error.
      controllerRef.current?.abort();
      controllerRef.current = null;
      dispatch({ type: "RESET" });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    dispatch({ type: "START", url: rawUrl });

    void (async () => {
      let resolvedUrl = rawUrl;
      try {
        const wellKnownDiscovery = GetConfig().wellKnownDiscovery ?? true;
        resolvedUrl = wellKnownDiscovery ? await resolveBaseUrlWithWellKnown(rawUrl, signal) : rawUrl;
        if (signal.aborted) {
          return;
        }
        if (resolvedUrl !== rawUrl) {
          onResolved?.(resolvedUrl);
        }

        const [featuresR, flowsR, metaR, versionR] = await Promise.allSettled([
          getSupportedFeatures(resolvedUrl, signal),
          getSupportedLoginFlows(resolvedUrl, signal),
          getAuthMetadata(resolvedUrl, signal),
          getServerVersion(resolvedUrl, signal),
        ]);
        if (signal.aborted) {
          return;
        }

        // getAuthMetadata resolves to null on failure rather than rejecting, so
        // reachability is judged by the three probes that reject on network error.
        const reachable =
          featuresR.status === "fulfilled" || flowsR.status === "fulfilled" || versionR.status === "fulfilled";
        if (!reachable) {
          dispatch({ type: "UNREACHABLE", url: resolvedUrl });
          return;
        }

        const flows: LoginFlow[] = flowsR.status === "fulfilled" && Array.isArray(flowsR.value) ? flowsR.value : [];
        const authMetadata = metaR.status === "fulfilled" ? metaR.value : null;
        const serverVersion = versionR.status === "fulfilled" ? versionR.value : "";
        // features.versions is an untyped server response; Array.isArray guards the shape.
        const matrixVersions: string[] =
          featuresR.status === "fulfilled" && Array.isArray(featuresR.value?.versions)
            ? (featuresR.value.versions as string[])
            : [];

        const caps = deriveCapabilities(resolvedUrl, flows, authMetadata, serverVersion, matrixVersions);

        if (!caps.password && !caps.sso && !caps.oidc) {
          dispatch({ type: "INCOMPATIBLE", url: resolvedUrl, advertisedFlows: flows.map(f => f.type) });
          return;
        }

        // Mark whether the deployment authenticates externally so the auth provider
        // drives the right path. Set unconditionally (not only when true) so a later
        // password-only server is not left stuck on a previous server's OIDC path.
        SetExternalAuthProvider(caps.oidc);
        dispatch({ type: "RESOLVED", url: resolvedUrl, caps });
      } catch (error) {
        if (signal.aborted) {
          return;
        }
        log.error("server probe failed", error);
        dispatch({ type: "UNREACHABLE", url: resolvedUrl });
      }
    })();
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    if (initialUrl) {
      start(initialUrl);
    }
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only probe; start is stable
  }, []);

  return { state, start, abort };
}

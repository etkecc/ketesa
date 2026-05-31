import { AuthMetadata } from "../../providers/matrix";

/** Which sign-in surface the form is showing. */
export type LoginMethod = "credentials" | "accessToken";

/**
 * Capabilities a homeserver advertises, derived from the login flows,
 * feature versions, and OIDC auth metadata once a probe resolves.
 *
 * password and sso are independent: a Synapse + SSO deployment advertises
 * both, so they are NOT mutually exclusive (the spec allows their coexistence).
 */
export interface ServerCapabilities {
  password: boolean;
  sso: boolean;
  oidc: boolean;
  oidcIssuer: string | null;
  /**
   * OR of the three "OIDC-aware clients should suppress password" signals:
   * org.matrix.msc3824.delegated_oidc_compatibility, delegated_oidc_compatibility,
   * and oauth_aware_preferred (Matrix v1.18 stable).
   */
  suppressPassword: boolean;
  serverVersion: string;
  matrixVersions: string[];
  authMetadata: AuthMetadata | null;
  ssoBaseUrl: string;
}

/**
 * The probe lifecycle as a discriminated union. Input visibility is driven by
 * loginMethod, never by which tag is active, so the form is never gone from the
 * DOM mid-probe (the keyboard-trap fix). Each non-idle tag carries the url it
 * describes, for the view layer; staleness is handled in useLoginProbe via the
 * AbortController, not here.
 *
 * incompatible is distinct from unreachable: the server answered cleanly but
 * advertises only auth methods Ketesa cannot drive — advertisedFlows carries
 * them so the error copy can name them.
 */
export type ProbeState =
  | { tag: "idle" }
  | { tag: "resolving"; url: string }
  | { tag: "ready"; url: string; caps: ServerCapabilities }
  | { tag: "incompatible"; url: string; advertisedFlows: string[] }
  | { tag: "unreachable"; url: string };

export type ProbeAction =
  | { type: "START"; url: string }
  | { type: "RESOLVED"; url: string; caps: ServerCapabilities }
  | { type: "INCOMPATIBLE"; url: string; advertisedFlows: string[] }
  | { type: "UNREACHABLE"; url: string }
  | { type: "RESET" };

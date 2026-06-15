import type { DeleteParams, RaRecord, UpdateParams } from "react-admin";

export interface MasPaginationLinks {
  self?: string;
  first?: string;
  last?: string;
  next?: string;
  prev?: string;
}

export interface MasPageMeta {
  page?: {
    cursor?: string;
  };
}

export interface MASRegistrationTokenAttributes {
  token: string;
  valid: boolean;
  usage_limit?: number;
  times_used: number;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  revoked_at?: string;
}

export interface MASRegistrationTokenResource {
  type: string;
  id: string;
  attributes: MASRegistrationTokenAttributes;
  meta?: MasPageMeta;
  links: {
    self: string;
  };
}

export interface MASRegistrationToken {
  data: MASRegistrationTokenResource;
  links: {
    self: string;
  };
}

export interface MASRegistrationTokenListResponse {
  data: MASRegistrationTokenResource[];
  meta?: {
    count?: number;
  };
  links?: MasPaginationLinks;
}

export interface BaseRegistrationTokensResource {
  path: string;
  data: string;
  create: (params: RaRecord) => { endpoint: string; body: object; method: string };
  delete: (params: DeleteParams) => { endpoint: string; method?: string; body?: object };
}

export interface RegistrationToken {
  token: string;
  uses_allowed: number;
  pending: number;
  completed: number;
  expiry_time?: number;
  // MAS-only fields
  created_at?: string;
  last_used_at?: string;
  revoked_at?: string;
}

export interface SynapseRegistrationTokensResourceType extends BaseRegistrationTokensResource {
  isMAS: false;
  map: (token: RegistrationToken) => object;
  total: (json: { registration_tokens: unknown[] }) => number;
}

export interface MASRegistrationTokensResourceType extends BaseRegistrationTokensResource {
  isMAS: true;
  map: (token: MASRegistrationToken | MASRegistrationTokenResource) => object;
  total: (json: MASRegistrationTokenListResponse) => number;
  handleCreateResponse: (token: MASRegistrationToken) => object;
  update: (params: UpdateParams) => { endpoint: string; body: object; method: string };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) => Record<string, any>;
}

export type RegistrationTokensResource = SynapseRegistrationTokensResourceType | MASRegistrationTokensResourceType;

export interface MASUserAttributes {
  username: string;
  created_at: string;
  locked_at: string | null;
  deactivated_at: string | null;
  admin: boolean;
  legacy_guest: boolean;
}

export interface MASUserResource {
  type: "user";
  id: string;
  attributes: MASUserAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASUserResponse {
  data: MASUserResource;
  links: { self: string };
}

export interface MASUserListResponse {
  data: MASUserResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASUserEmailAttributes {
  created_at: string;
  user_id: string;
  email: string;
}

export interface MASUserEmailResource {
  type: "user-email";
  id: string;
  attributes: MASUserEmailAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASUserEmailListResponse {
  data: MASUserEmailResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASCompatSessionAttributes {
  user_id: string;
  device_id: string | null;
  user_session_id: string | null;
  redirect_uri: string | null;
  created_at: string;
  user_agent: string | null;
  last_active_at: string | null;
  last_active_ip: string | null;
  finished_at: string | null;
  human_name: string | null;
}

export interface MASCompatSessionResource {
  type: "compat-session";
  id: string;
  attributes: MASCompatSessionAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASCompatSessionListResponse {
  data: MASCompatSessionResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASOAuth2SessionAttributes {
  created_at: string;
  finished_at: string | null;
  user_id: string | null;
  user_session_id: string | null;
  client_id: string;
  scope: string;
  user_agent: string | null;
  last_active_at: string | null;
  last_active_ip: string | null;
  human_name: string | null;
}

export interface MASOAuth2SessionResource {
  type: "oauth2-session";
  id: string;
  attributes: MASOAuth2SessionAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASOAuth2SessionListResponse {
  data: MASOAuth2SessionResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASPersonalSessionAttributes {
  created_at: string;
  revoked_at: string | null;
  owner_user_id: string | null;
  actor_user_id: string | null;
  human_name: string | null;
  scope: string;
  last_active_at: string | null;
  last_active_ip: string | null;
  expires_at: string | null;
  access_token?: string | null;
}

export interface MASPersonalSessionResource {
  type: "personal-session";
  id: string;
  attributes: MASPersonalSessionAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASPersonalSessionListResponse {
  data: MASPersonalSessionResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASUserSessionAttributes {
  user_id: string;
  created_at: string;
  finished_at: string | null;
  user_agent: string | null;
  last_active_at: string | null;
  last_active_ip: string | null;
}

export interface MASUserSessionResource {
  type: "browser-session";
  id: string;
  attributes: MASUserSessionAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASUserSessionListResponse {
  data: MASUserSessionResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASPolicyDataAttributes {
  created_at: string;
  data: unknown; // free-form JSON; operator-defined OPA data document
}

export interface MASPolicyDataResource {
  type: "policy-data";
  id: string;
  attributes: MASPolicyDataAttributes;
  links: { self: string };
}

export interface MASPolicyData {
  id: string;
  data: unknown;
  created_at: string;
}

export interface MASUpstreamOAuthLinkAttributes {
  created_at: string;
  provider_id: string;
  subject: string;
  user_id: string;
  human_account_name: string | null;
}

export interface MASUpstreamOAuthLinkResource {
  type: "upstream-oauth-link";
  id: string;
  attributes: MASUpstreamOAuthLinkAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASUpstreamOAuthLinkListResponse {
  data: MASUpstreamOAuthLinkResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

export interface MASUpstreamOAuthProviderAttributes {
  issuer: string | null;
  human_name: string | null;
  brand_name: string | null;
  created_at: string;
  disabled_at: string | null;
}

export interface MASUpstreamOAuthProviderResource {
  type: "upstream-oauth-provider";
  id: string;
  attributes: MASUpstreamOAuthProviderAttributes;
  links: { self: string };
  meta?: MasPageMeta;
}

export interface MASUpstreamOAuthProviderListResponse {
  data: MASUpstreamOAuthProviderResource[];
  meta?: { count?: number };
  links?: MasPaginationLinks;
}

import type { DataProvider, Identifier } from "react-admin";

import type { AccountDataModel, ExperimentalFeaturesModel, RateLimitsModel, UsernameAvailabilityResult } from "./users";
import type { EventContextResult, RoomHierarchyResult, RoomMessagesResult } from "./rooms";
import type { MASPolicyData } from "./mas";
import type {
  ComponentsResponse,
  PaymentsResponse,
  RecurringCommand,
  ScheduledCommand,
  ServerCommandsResponse,
  ServerNotificationsResponse,
  ServerProcessResponse,
  ServerStatusResponse,
  SupportMessage,
  SupportAttachment,
  SupportRequest,
  SupportRequestDetail,
} from "./etke";

export interface RaServerNotice {
  id: string;
  body: string;
}

export interface ScheduledTask {
  id: string;
  action: string;
  status: string;
  timestamp_ms: number;
  resource_id?: string;
  result?: unknown;
  error?: string;
}

export interface DeleteMediaParams {
  before_ts: number;
  size_gt: number;
  keep_profiles: boolean;
}

export interface DeleteMediaResult {
  deleted_media: Identifier[];
  total: number;
}

export interface UploadMediaParams {
  file: File;
  filename: string;
  content_type: string;
}

export interface UploadMediaResult {
  content_uri: string;
}

export interface DatabaseRoomStatistic {
  room_id: string;
  estimated_size: number;
}

export interface UserMediaStatistic {
  displayname: string;
  media_count: number;
  media_length: number;
  user_id: string;
}

export interface AdminClientConfig {
  return_soft_failed_events: boolean;
  return_policy_server_spammy_events: boolean;
}

export interface SynapseDataProvider extends DataProvider {
  deleteMedia: (params: DeleteMediaParams) => Promise<DeleteMediaResult>;
  purgeRemoteMedia: (params: Pick<DeleteMediaParams, "before_ts">) => Promise<DeleteMediaResult>;
  uploadMedia: (params: UploadMediaParams) => Promise<UploadMediaResult>;
  updateFeatures: (id: Identifier, features: ExperimentalFeaturesModel) => Promise<void>;
  getRateLimits: (id: Identifier) => Promise<RateLimitsModel>;
  setRateLimits: (id: Identifier, rateLimits: RateLimitsModel) => Promise<void>;
  getSentInviteCount: (id: Identifier, fromTs?: number) => Promise<number>;
  getCumulativeJoinedRoomCount: (id: Identifier, fromTs?: number) => Promise<number>;
  getAccountData: (id: Identifier) => Promise<AccountDataModel>;
  checkUsernameAvailability: (username: string) => Promise<UsernameAvailabilityResult>;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  fetchEvent: (eventId: string) => Promise<Record<string, any>>;
  revokeRegistrationToken: (id: string, revoke: boolean) => Promise<{ success: boolean; error?: string }>;
  blockRoom: (roomId: string, block: boolean) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  getRoomBlockStatus: (
    roomId: string
  ) => Promise<{ success: boolean; block: boolean; error?: string; errcode?: string }>;
  deleteDevices: (
    user_id: string,
    devices: string[]
  ) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  joinUserToRoom: (room_id: string, user_id: string) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  makeRoomAdmin: (room_id: string, user_id: string) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  suspendUser: (
    id: Identifier,
    suspendValue: boolean
  ) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  shadowBanUser: (
    id: Identifier,
    shadowBan: boolean
  ) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  resetPassword: (
    id: Identifier,
    newPassword: string,
    logoutDevices?: boolean
  ) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  loginAsUser: (
    id: Identifier,
    validUntilMs?: number
  ) => Promise<{ success: boolean; access_token?: string; error?: string; errcode?: string }>;
  eraseUser: (id: Identifier) => Promise<{ success: boolean; error?: string; errcode?: string }>;
  renewAccountValidity: (
    userId: string,
    expirationTs?: number,
    enableRenewalEmails?: boolean
  ) => Promise<{ success: boolean; expiration_ts?: number; error?: string; errcode?: string }>;
  allowCrossSigningReplacement: (
    userId: string
  ) => Promise<{ success: boolean; updatable_without_uia_before_ms?: number; error?: string; errcode?: string }>;
  findUserByThreepid: (
    medium: string,
    address: string
  ) => Promise<{ success: boolean; user_id?: string; error?: string; errcode?: string }>;
  findUserByAuthProvider: (
    provider: string,
    externalId: string
  ) => Promise<{ success: boolean; user_id?: string; error?: string; errcode?: string }>;
  getEventByTimestamp: (
    roomId: string,
    ts: number,
    dir?: "f" | "b"
  ) => Promise<{ success: boolean; event_id?: string; origin_server_ts?: number; error?: string; errcode?: string }>;
  getEventContext: (
    roomId: string,
    eventId: string,
    limit?: number
  ) => Promise<{ success: boolean; data?: EventContextResult; error?: string; errcode?: string }>;
  getRoomMessages: (
    roomId: string,
    params: { from: string; to?: string; limit?: number; dir?: "f" | "b"; filter?: string }
  ) => Promise<{ success: boolean; data?: RoomMessagesResult; error?: string; errcode?: string }>;
  getRoomHierarchy: (
    roomId: string,
    params?: { from?: string; limit?: number; max_depth?: number }
  ) => Promise<{ success: boolean; data?: RoomHierarchyResult; error?: string; errcode?: string }>;
  deleteUserMedia: (id: Identifier) => Promise<DeleteMediaResult>;
  deleteRoomMedia: (
    roomId: string,
    onProgress?: (current: number, total: number) => void
  ) => Promise<{ total: number }>;
  quarantineRoomMedia: (
    roomId: string
  ) => Promise<{ success: boolean; num_quarantined: number; error?: string; errcode?: string }>;
  quarantineUserMedia: (
    userId: string
  ) => Promise<{ success: boolean; num_quarantined: number; error?: string; errcode?: string }>;
  purgeHistory: (
    roomId: string,
    purge_up_to_ts: number,
    delete_local_events: boolean
  ) => Promise<{ success: boolean; purge_id?: string; error?: string; errcode?: string }>;
  getPurgeHistoryStatus: (
    purgeId: string
  ) => Promise<{ success: boolean; status?: string; error?: string; errcode?: string }>;
  deleteRoom: (
    roomId: string,
    block: boolean
  ) => Promise<{ success: boolean; delete_id?: string; error?: string; errcode?: string }>;
  getRoomDeleteStatus: (
    deleteId: string
  ) => Promise<{ success: boolean; status?: string; error?: string; errcode?: string }>;
  redactUserEvents: (id: Identifier) => Promise<{ redact_id: string }>;
  getRedactStatus: (redactId: string) => Promise<{
    success: boolean;
    status: string;
    failed_redactions: Record<string, string>;
    error?: string;
    errcode?: string;
  }>;
  getServerRunningProcess: (etkeAdminUrl: string, locale: string) => Promise<ServerProcessResponse>;
  getServerStatus: (etkeAdminUrl: string, locale: string) => Promise<ServerStatusResponse>;
  getServerNotifications: (etkeAdminUrl: string, locale: string) => Promise<ServerNotificationsResponse>;
  deleteServerNotifications: (etkeAdminUrl: string, locale: string) => Promise<{ success: boolean }>;
  getUnits: (etkeAdminUrl: string, locale: string) => Promise<string[]>;
  getServerCommands: (
    etkeAdminUrl: string,
    locale: string
  ) => Promise<{ maintenance: boolean; commands: ServerCommandsResponse[] }>;
  getScheduledCommands: (etkeAdminUrl: string, locale: string) => Promise<ScheduledCommand[]>;
  getRecurringCommands: (etkeAdminUrl: string, locale: string) => Promise<RecurringCommand[]>;
  createScheduledCommand: (
    etkeAdminUrl: string,
    locale: string,
    command: Partial<ScheduledCommand>
  ) => Promise<ScheduledCommand>;
  updateScheduledCommand: (
    etkeAdminUrl: string,
    locale: string,
    command: ScheduledCommand
  ) => Promise<ScheduledCommand>;
  deleteScheduledCommand: (etkeAdminUrl: string, locale: string, id: string) => Promise<{ success: boolean }>;
  createRecurringCommand: (
    etkeAdminUrl: string,
    locale: string,
    command: Partial<RecurringCommand>
  ) => Promise<RecurringCommand>;
  updateRecurringCommand: (
    etkeAdminUrl: string,
    locale: string,
    command: RecurringCommand
  ) => Promise<RecurringCommand>;
  deleteRecurringCommand: (etkeAdminUrl: string, locale: string, id: string) => Promise<{ success: boolean }>;
  getComponents: (etkeAdminUrl: string, locale: string) => Promise<ComponentsResponse>;
  getPayments: (etkeAdminUrl: string, locale: string) => Promise<PaymentsResponse>;
  getInvoice: (etkeAdminUrl: string, locale: string, transactionId: string) => Promise<void>;
  getSupportRequests: (etkeAdminUrl: string, locale: string) => Promise<SupportRequest[]>;
  getSupportRequest: (
    etkeAdminUrl: string,
    locale: string,
    id: string,
    burstCache?: boolean
  ) => Promise<SupportRequestDetail>;
  createSupportRequest: (
    etkeAdminUrl: string,
    locale: string,
    subject: string,
    message: string,
    attachments?: SupportAttachment[]
  ) => Promise<SupportRequest>;
  postSupportMessage: (
    etkeAdminUrl: string,
    locale: string,
    id: string,
    message: string,
    attachments?: SupportAttachment[],
    close?: boolean
  ) => Promise<SupportMessage>;
  getAdminClientConfig: () => Promise<AdminClientConfig>;
  setAdminClientConfig: (config: AdminClientConfig) => Promise<void>;
  masLockUser: (id: string, lock: boolean) => Promise<{ success: boolean; error?: string }>;
  masDeactivateUser: (id: string, active: boolean) => Promise<{ success: boolean; error?: string }>;
  masSetAdmin: (id: string, admin: boolean) => Promise<{ success: boolean; error?: string }>;
  masSetPassword: (id: string, password: string) => Promise<{ success: boolean; error?: string }>;
  masFinishSession: (
    resource: "mas_compat_sessions" | "mas_oauth2_sessions",
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  masRevokePersonalSession: (id: string) => Promise<{ success: boolean; error?: string }>;
  masRegeneratePersonalSession: (id: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  masFinishUserSession: (id: string) => Promise<{ success: boolean; error?: string }>;
  getMASPolicyData: () => Promise<MASPolicyData | null>;
  setMASPolicyData: (data: unknown) => Promise<{ success: boolean; error?: string }>;
}

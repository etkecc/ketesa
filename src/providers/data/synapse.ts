import { DeleteParams, Identifier, RaRecord, fetchUtils } from "react-admin";
import {
  DatabaseRoomStatistic,
  Destination,
  DestinationRoom,
  ScheduledTask,
  Device,
  EventReport,
  ForwardExtremity,
  Membership,
  Pusher,
  RaServerNotice,
  RegistrationToken,
  Room,
  RoomState,
  SynapseRegistrationTokensResourceType,
  User,
  UserMedia,
  UserMediaStatistic,
  Whois,
} from "../types";
import { returnMXID } from "../../utils/mxid";
import { normalizeTS } from "../../utils/date";

/**
 * Get Synapse server version via /_synapse/admin/v1/server_version
 */
export const getServerVersion = async (baseUrl: string, signal?: AbortSignal): Promise<string> => {
  const response = await fetchUtils.fetchJson(`${baseUrl}/_synapse/admin/v1/server_version`, {
    method: "GET",
    signal,
  });
  return response.json.server_version;
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const CACHED_MANY_REF: Record<string, any> = {};

export const invalidateManyRefCache = (pattern: string) => {
  for (const key of Object.keys(CACHED_MANY_REF)) {
    if (key.includes(pattern)) {
      delete CACHED_MANY_REF[key];
    }
  }
};

export const synapseRegistrationTokensResource: SynapseRegistrationTokensResourceType = {
  path: "/_synapse/admin/v1/registration_tokens",
  isMAS: false,
  map: (rt: RegistrationToken) => ({ ...rt, id: rt.token }),
  data: "registration_tokens",
  total: json => json.registration_tokens.length,
  create: (params: RaRecord) => ({
    endpoint: "/_synapse/admin/v1/registration_tokens/new",
    body: params,
    method: "POST",
  }), // Synapse accepts Unix timestamps as-is
  delete: (params: DeleteParams) => ({
    endpoint: `/_synapse/admin/v1/registration_tokens/${params.id}`,
  }),
};

export const synapseResourceMap = {
  users: {
    path: "/_synapse/admin/v2/users",
    listPath: "/_synapse/admin/v3/users",
    map: (u: User) => ({
      ...u,
      id: returnMXID(u.name),
      avatar_src: u.avatar_url ? u.avatar_url : undefined,
      is_guest: !!u.is_guest,
      admin: !!u.admin,
      deactivated: !!u.deactivated,
      shadow_banned: !!u.shadow_banned,
      // Normalize across Synapse user endpoints before the value reaches the UI.
      creation_ts_ms: normalizeTS(u.creation_ts),
    }),
    data: "users",
    total: (json: { total: number }) => json.total,
    create: (data: RaRecord) => ({
      endpoint: `/_synapse/admin/v2/users/${encodeURIComponent(returnMXID(data.id))}`,
      body: data,
      method: "PUT",
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/deactivate/${encodeURIComponent(returnMXID(params.id))}`,
      body: { erase: true },
      method: "POST",
    }),
  },
  rooms: {
    path: "/_synapse/admin/v1/rooms",
    map: (r: Room) => ({
      ...r,
      id: r.room_id,
      alias: r.canonical_alias,
      members: r.joined_members,
      is_encrypted: !!r.encryption,
      federatable: !!r.federatable,
      public: !!r.public,
    }),
    data: "rooms",
    total: (json: { total_rooms: number }) => json.total_rooms,
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v2/rooms/${params.id}`,
      body: { block: params.meta?.block ?? false },
    }),
  },
  reports: {
    path: "/_synapse/admin/v1/event_reports",
    map: (er: EventReport) => ({ ...er }),
    data: "event_reports",
    total: (json: { total: number }) => json.total,
  },
  devices: {
    map: (d: Device) => ({ ...d, id: d.device_id }),
    data: "devices",
    total: (json: { total: number }) => json.total,
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v2/users/${encodeURIComponent(id)}/devices`,
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v2/users/${encodeURIComponent(params.previousData.user_id)}/devices/${params.id}`,
    }),
  },
  connections: {
    path: "/_synapse/admin/v1/whois",
    map: (c: Whois) => ({ ...c, id: c.user_id }),
    data: "connections",
  },
  room_members: {
    map: (m: string) => ({ id: m }),
    reference: (id: Identifier) => ({ endpoint: `/_synapse/admin/v1/rooms/${id}/members` }),
    data: "members",
    total: (json: { total: number }) => json.total,
  },
  room_media: {
    map: (mediaId: string) => ({
      id: mediaId.replace("mxc://" + localStorage.getItem("home_server") + "/", ""),
      media_id: mediaId.replace("mxc://" + localStorage.getItem("home_server") + "/", ""),
    }),
    reference: (id: Identifier) => ({ endpoint: `/_synapse/admin/v1/room/${id}/media` }),
    total: (json: { total: number }) => json.total,
    data: "local",
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/media/${localStorage.getItem("home_server")}/${params.id}`,
    }),
  },
  room_state: {
    map: (rs: RoomState) => ({ ...rs, id: rs.event_id }),
    reference: (id: Identifier) => ({ endpoint: `/_synapse/admin/v1/rooms/${id}/state` }),
    data: "state",
    total: (json: { state: unknown[] }) => json.state.length,
  },
  pushers: {
    map: (p: Pusher) => ({ ...p, id: p.pushkey }),
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v1/users/${encodeURIComponent(id)}/pushers`,
    }),
    data: "pushers",
    total: (json: { total: number }) => json.total,
  },
  joined_rooms: {
    map: (jr: string) => ({ id: jr }),
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v1/users/${encodeURIComponent(id)}/joined_rooms`,
    }),
    data: "joined_rooms",
    total: (json: { total: number }) => json.total,
  },
  memberships: {
    map: (m: Membership) => ({ ...m }),
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v1/users/${encodeURIComponent(id)}/memberships`,
    }),
    data: "memberships",
    total: (json: { total: number }) => json.total,
  },
  users_media: {
    map: (um: UserMedia) => ({ ...um, id: um.media_id }),
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v1/users/${encodeURIComponent(returnMXID(id))}/media`,
    }),
    data: "media",
    total: (json: { total: number }) => json.total,
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/media/${localStorage.getItem("home_server")}/${params.id}`,
    }),
  },
  protect_media: {
    map: (pm: UserMedia) => ({ id: pm.media_id }),
    create: (params: UserMedia) => ({
      endpoint: `/_synapse/admin/v1/media/protect/${params.media_id}`,
      method: "POST",
      response: (data: RaRecord) => ({ ...data, safe_from_quarantine: true }),
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/media/unprotect/${params.id}`,
      method: "POST",
      response: (data: RaRecord) => ({ ...data, safe_from_quarantine: false }),
    }),
  },
  quarantine_media: {
    map: (qm: UserMedia) => ({ id: qm.media_id }),
    create: (params: UserMedia) => ({
      endpoint: `/_synapse/admin/v1/media/quarantine/${localStorage.getItem("home_server")}/${params.media_id}`,
      method: "POST",
      response: (data: RaRecord) => ({ ...data, quarantined_by: localStorage.getItem("user_id") || "admin" }),
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/media/unquarantine/${localStorage.getItem("home_server")}/${params.id}`,
      method: "POST",
      response: (data: RaRecord) => ({ ...data, quarantined_by: "" }),
    }),
  },
  servernotices: {
    map: (n: { event_id: string }) => ({ id: n.event_id }),
    create: (data: RaServerNotice) => ({
      endpoint: "/_synapse/admin/v1/send_server_notice",
      body: {
        user_id: returnMXID(data.id),
        content: { msgtype: "m.text", body: data.body },
      },
      method: "POST",
    }),
  },
  database_room_statistics: {
    path: "/_synapse/admin/v1/statistics/database/rooms",
    map: (drs: DatabaseRoomStatistic) => ({ ...drs, id: drs.room_id }),
    data: "rooms",
    total: (json: { rooms: DatabaseRoomStatistic[] }) => json.rooms.length,
    noQueryParams: true,
    // Synapse returns 500 when the stats table hasn't been populated yet.
    // Treat it as an empty result so the empty state renders instead of an error.
    // See: https://github.com/element-hq/synapse/issues/19561
    ignoredErrors: [500],
  },
  user_media_statistics: {
    path: "/_synapse/admin/v1/statistics/users/media",
    map: (usms: UserMediaStatistic) => ({ ...usms, id: returnMXID(usms.user_id) }),
    data: "users",
    total: (json: { total: number }) => json.total,
  },
  forward_extremities: {
    map: (fe: ForwardExtremity) => ({ ...fe, id: fe.event_id }),
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v1/rooms/${id}/forward_extremities`,
    }),
    data: "results",
    total: (json: { count: number }) => json.count,
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/rooms/${params.id}/forward_extremities`,
    }),
  },
  destinations: {
    path: "/_synapse/admin/v1/federation/destinations",
    map: (dst: Destination) => ({ ...dst, id: dst.destination }),
    data: "destinations",
    total: (json: { total: number }) => json.total,
    delete: (params: DeleteParams) => ({
      endpoint: `/_synapse/admin/v1/federation/destinations/${params.id}/reset_connection`,
      method: "POST",
    }),
  },
  destination_rooms: {
    map: (dstroom: DestinationRoom) => ({ ...dstroom, id: dstroom.room_id }),
    reference: (id: Identifier) => ({
      endpoint: `/_synapse/admin/v1/federation/destinations/${id}/rooms`,
    }),
    data: "rooms",
    total: (json: { total: number }) => json.total,
  },
  scheduled_tasks: {
    path: "/_synapse/admin/v1/scheduled_tasks",
    map: (st: ScheduledTask) => ({ ...st }),
    data: "scheduled_tasks",
    total: (json: { scheduled_tasks: unknown[] }) => json.scheduled_tasks.length,
  },
};

// MAS resource factories consumed by the data provider; helpers in mas-utils.ts, actions in mas-actions.ts.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { DeleteParams, GetListResult, PaginationPayload, RaRecord, SortPayload, UpdateParams } from "react-admin";

import { jsonClient } from "../http";
import { normalizeTS } from "../../utils/date";
import { getLocalpart } from "../../utils/mxid";
import { buildScanCacheKey, masFilterScanCache, runVirtualScan } from "./scan";
import { synapseResourceMap } from "./synapse";
import {
  convertMASTokenToSynapse,
  detectAndSetMAS,
  filterUndefined,
  getMASBaseUrl,
  getMASNextPageCursor,
  getMASVersion,
  getMASTokenResource,
  isMAS,
  setIsMAS,
  toRfc3339,
  useIsMAS,
} from "./mas-utils";

import {
  MASCompatSessionListResponse,
  MASCompatSessionResource,
  MASOAuth2SessionListResponse,
  MASOAuth2SessionResource,
  MASPersonalSessionListResponse,
  MASPersonalSessionResource,
  MASRegistrationToken,
  MASRegistrationTokenListResponse,
  MASRegistrationTokenResource,
  MASRegistrationTokensResourceType,
  MASUpstreamOAuthLinkListResponse,
  MASUpstreamOAuthLinkResource,
  MASUpstreamOAuthProviderListResponse,
  MASUpstreamOAuthProviderResource,
  MASUserEmailListResponse,
  MASUserEmailResource,
  MASUserListResponse,
  MASUserResource,
  MASUserSessionListResponse,
  MASUserSessionResource,
} from "../types";

// Re-export utilities consumed by components and auth providers that import from this module.
export { detectAndSetMAS, getMASBaseUrl, getMASNextPageCursor, getMASVersion, isMAS, setIsMAS, useIsMAS };

export const getMASRegistrationTokensResource = (): MASRegistrationTokensResourceType => ({
  path: "/api/admin/v1/user-registration-tokens",
  isMAS: true,
  map: (token: MASRegistrationToken | MASRegistrationTokenResource) => {
    const resource = getMASTokenResource(token);
    const converted = convertMASTokenToSynapse(resource);
    return { ...converted, id: resource.id || converted.token };
  },
  data: "data",
  total: (json: MASRegistrationTokenListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[valid]": filter.valid,
      count: "true",
    }),
  create: (params: RaRecord) => ({
    endpoint: "/api/admin/v1/user-registration-tokens",
    body: {
      token: params.token || undefined,
      usage_limit: params.uses_allowed ?? undefined,
      expires_at: toRfc3339(params.expiry_time),
    },
    method: "POST",
  }),
  handleCreateResponse: (token: MASRegistrationToken) => {
    const resource = getMASTokenResource(token);
    const converted = convertMASTokenToSynapse(resource);
    return { ...converted, id: resource.id || converted.token };
  },
  delete: (params: DeleteParams) => ({
    endpoint: `/api/admin/v1/user-registration-tokens/${params.id}/revoke`,
    method: "POST",
  }),
  update: (params: UpdateParams) => ({
    endpoint: `/api/admin/v1/user-registration-tokens/${params.id}`,
    body: {
      usage_limit: params.data.uses_allowed ?? undefined,
      expires_at: toRfc3339(params.data.expiry_time),
    },
    method: "PUT",
  }),
});

// Helper shared between getMASUsersResource and getMASUsersAsMainResource
const mapMASUserItem = (item: MASUserResource, homeserverId?: string) => {
  const homeserver = homeserverId || localStorage.getItem("home_server") || "";
  return {
    id: item.id, // ULID; for mas_users data resource (ReferenceInput)
    mas_id: item.id,
    username: item.attributes.username,
    admin: item.attributes.admin,
    locked: !!item.attributes.locked_at,
    deactivated: !!item.attributes.deactivated_at,
    created_at: item.attributes.created_at,
    locked_at: item.attributes.locked_at,
    deactivated_at: item.attributes.deactivated_at,
    legacy_guest: item.attributes.legacy_guest,
    // Synapse-compatible fields
    name: `@${item.attributes.username}:${homeserver}`,
  };
};

// Enriches MAS user records with Synapse profile data; admin stays Synapse-only by design.
const enrichMASUserList = async (records: RaRecord[]): Promise<RaRecord[]> => {
  const synapseBaseUrl = localStorage.getItem("base_url") || "";
  return Promise.all(
    records.map(async record => {
      try {
        const matrixId = encodeURIComponent(record.id);
        const { json } = await jsonClient(`${synapseBaseUrl}/_synapse/admin/v2/users/${matrixId}`);
        return {
          ...record,
          avatar_src: json.avatar_url ?? null,
          displayname: json.displayname ?? null,
          // Normalize across Synapse user endpoints before the value reaches the UI.
          creation_ts_ms: normalizeTS(json.creation_ts),
          is_guest: !!json.is_guest,
          shadow_banned: !!json.shadow_banned,
          erased: !!json.erased,
          deactivated: !!json.deactivated,
          suspended: !!json.suspended,
        };
      } catch {
        return record;
      }
    })
  );
};

// Scans Synapse v3 for status/admin filters, filtering on MAS-merged state Synapse lacks.
const scanMASFilteredUsers = async (params: {
  pagination: PaginationPayload;
  sort: SortPayload;
  filter: Record<string, any>;
}): Promise<GetListResult> => {
  const masBaseUrl = getMASBaseUrl();
  const synapseBaseUrl = localStorage.getItem("base_url") || "";
  const { page, perPage } = params.pagination;
  const { field, order } = params.sort;
  const { status, admin, name, search } = params.filter;

  // Full MAS user list as the in-memory lookup for the merged filter state.
  const masByUsername = new Map<string, MASUserResource>();
  if (masBaseUrl) {
    let cursor: string | undefined;
    do {
      const query = filterUndefined({ "page[first]": 100, "page[after]": cursor, count: "true" });
      const url = `${masBaseUrl}/api/admin/v1/users?${new URLSearchParams(query as Record<string, string>).toString()}`;
      const { json } = await jsonClient(url);
      for (const u of (json?.data as MASUserResource[]) || []) {
        masByUsername.set(u.attributes.username, u);
      }
      cursor = json?.links?.next ? getMASNextPageCursor(json) : undefined;
    } while (cursor);
  }

  // Map sort field to Synapse order_by
  const orderByMap: Record<string, string> = {
    creation_ts_ms: "creation_ts",
  };
  const orderBy = orderByMap[field] ?? field;

  // locked=true is inclusive; exclusive deactivated/admins filters would drop MAS-only state.
  const baseQuery = filterUndefined({
    order_by: orderBy,
    dir: order === "DESC" ? "b" : "f",
    name: name || search || undefined,
    guests: false,
    locked: true,
  });

  const cacheKey = buildScanCacheKey({
    resource: "users",
    baseUrl: synapseBaseUrl,
    query: baseQuery,
    status,
    admin,
  });
  const pageStart = (page - 1) * perPage;
  const pageEnd = pageStart + perPage;

  return runVirtualScan({
    cache: masFilterScanCache,
    cacheKey,
    pageStart,
    pageEnd,
    perPage,
    fetchPage: async (offset, limit) => {
      const pagedQuery = { ...baseQuery, from: offset, limit };
      const url = `${synapseBaseUrl}/_synapse/admin/v3/users?${new URLSearchParams(
        filterUndefined(pagedQuery) as Record<string, string>
      ).toString()}`;
      const { json } = await jsonClient(url);
      const rawData: any[] = json.users || [];
      const records = rawData.map(synapseResourceMap.users.map);
      return { rawCount: rawData.length, records, serverTotal: json.total || 0 };
    },
    filterFn: record => {
      const username = getLocalpart(record.id);
      const mas = masByUsername.get(username);
      const mergedAdmin = !!record.admin || !!mas?.attributes.admin;
      const mergedLocked = mas ? !!mas.attributes.locked_at : !!record.locked;
      const mergedDeactivated = mas ? !!mas.attributes.deactivated_at : !!record.deactivated;
      if (status === "active") return !mergedLocked && !mergedDeactivated;
      if (status === "locked") return mergedLocked;
      if (status === "deactivated") return mergedDeactivated;
      if (admin === true) return mergedAdmin;
      if (admin === false) return !mergedAdmin;
      return true;
    },
    notifyKey: "resources.users.action.system_users_scan_in_progress",
    enrichList: enrichMASUserList,
  });
};

export const getMASUsersResource = () => ({
  path: "/api/admin/v1/users",
  isMAS: true,
  map: (item: MASUserResource | { data: MASUserResource }) => {
    const u = "data" in item ? item.data : item;
    return mapMASUserItem(u);
  },
  data: "data",
  total: (json: MASUserListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[search]": filter.search,
      "filter[status]": filter.status,
      "filter[admin]": filter.admin,
      count: "true",
    }),
  create: (params: RaRecord) => ({
    endpoint: "/api/admin/v1/users",
    body: { username: params.username },
    method: "POST",
  }),
  update: (params: UpdateParams) => ({
    endpoint: `/api/admin/v1/users/${params.id}`,
    method: "GET",
  }),
  handleCreateResponse: (item: { data: MASUserResource }) => mapMASUserItem(item.data),
});

// Main MAS users resource: maps ids to @username:homeserver so Synapse tabs work; ULID stored as mas_id.
export const getMASUsersAsMainResource = () => ({
  path: "/api/admin/v1/users",
  isMAS: true,
  map: (item: MASUserResource | { data: MASUserResource }) => {
    const u = "data" in item ? item.data : item;
    const homeserver = localStorage.getItem("home_server") || "";
    return {
      ...mapMASUserItem(u, homeserver),
      id: `@${u.attributes.username}:${homeserver}`,
    };
  },
  // enrichList (scan path) sources admin from Synapse only, unlike getList/getOne, to avoid a per-record MAS fetch.
  enrichList: enrichMASUserList,
  getList: async (params: { pagination: PaginationPayload; sort: SortPayload; filter: Record<string, any> }) => {
    // MAS status/admin filters need the MAS-merged state (see scanMASFilteredUsers).
    if (params.filter.status || params.filter.admin !== undefined) {
      return scanMASFilteredUsers(params);
    }

    // Synapse-first path: fetch from Synapse v3, then enrich with MAS; includes Synapse-only appservice/bot users.
    const synapseBaseUrl = localStorage.getItem("base_url") || "";
    const masBaseUrl = getMASBaseUrl();
    const homeserver = localStorage.getItem("home_server") || "";
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;

    // Map sort field to Synapse order_by
    const orderByMap: Record<string, string> = {
      creation_ts_ms: "creation_ts",
    };
    const orderBy = orderByMap[field] ?? field;

    const synapseQuery = filterUndefined({
      from: (page - 1) * perPage,
      limit: perPage,
      order_by: orderBy,
      dir: order === "DESC" ? "b" : "f",
      name: params.filter.name || params.filter.search || undefined,
      guests: false,
      deactivated: params.filter.deactivated,
      locked: params.filter.locked,
    });

    const synapseUrl = `${synapseBaseUrl}/_synapse/admin/v3/users?${new URLSearchParams(
      synapseQuery as Record<string, string>
    ).toString()}`;
    const { json } = await jsonClient(synapseUrl);

    const synapseUsers: any[] = json.users || [];

    const mergedRecords = await Promise.all(
      synapseUsers.map(async u => {
        // Extract local username from MXID (@user:homeserver)
        const mxid: string = u.name || "";
        const username = mxid.startsWith("@") ? mxid.slice(1).split(":")[0] : mxid;

        // Synapse-only base record
        const synapseRecord = {
          id: mxid,
          name: mxid,
          mas_id: undefined as string | undefined,
          username,
          admin: !!u.admin,
          deactivated: !!u.deactivated,
          locked: false,
          created_at: undefined as string | undefined,
          locked_at: null as string | null,
          deactivated_at: null as string | null,
          legacy_guest: undefined as boolean | undefined,
          is_guest: !!u.is_guest,
          erased: !!u.erased,
          shadow_banned: !!u.shadow_banned,
          suspended: !!u.suspended,
          avatar_src: u.avatar_url ?? null,
          displayname: u.displayname ?? null,
          user_type: u.user_type ?? null,
          appservice_id: u.appservice_id ?? null,
          // Normalize across Synapse user endpoints before the value reaches the UI.
          creation_ts_ms: normalizeTS(u.creation_ts),
        };

        if (!masBaseUrl) return synapseRecord;

        try {
          const masQuery = new URLSearchParams(
            filterUndefined({ "filter[search]": username, "page[first]": "50", count: "true" }) as Record<
              string,
              string
            >
          ).toString();
          const { json: masJson } = await jsonClient(`${masBaseUrl}/api/admin/v1/users?${masQuery}`);
          const masUsers: MASUserResource[] = (masJson?.data as MASUserResource[]) || [];
          const masUser = masUsers.find(mu => mu.attributes.username === username);

          if (!masUser) return synapseRecord;

          const masBase = mapMASUserItem(masUser, homeserver);
          return {
            ...masBase,
            id: mxid,
            name: mxid,
            mas_id: masUser.id,
            username,
            // Crown shows if admin on either surface: Synapse homeserver-admin OR MAS can_request_admin.
            admin: !!u.admin || !!masBase.admin,
            deactivated: masBase.deactivated,
            locked: !!masUser.attributes.locked_at,
            created_at: masBase.created_at,
            locked_at: masUser.attributes.locked_at ?? null,
            deactivated_at: masUser.attributes.deactivated_at ?? null,
            legacy_guest: masBase.legacy_guest,
            is_guest: !!u.is_guest,
            erased: !!u.erased,
            shadow_banned: !!u.shadow_banned,
            suspended: !!u.suspended,
            avatar_src: u.avatar_url ?? null,
            displayname: u.displayname ?? null,
            user_type: u.user_type ?? null,
            appservice_id: u.appservice_id ?? null,
            // Normalize across Synapse user endpoints before the value reaches the UI.
            creation_ts_ms: normalizeTS(u.creation_ts),
          };
        } catch {
          // MAS lookup failed; return Synapse-only record
          return synapseRecord;
        }
      })
    );

    return { data: mergedRecords, total: json.total || 0 };
  },
  data: "data",
  total: (json: MASUserListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      // support Synapse-style "name" search filter as well as MAS "search"
      "filter[search]": filter.name || filter.search,
      "filter[status]": filter.status,
      "filter[admin]": filter.admin !== undefined ? filter.admin : undefined,
      count: "true",
    }),
  getOne: async (params: { id: string | number }) => {
    const id = String(params.id);
    const username = id.startsWith("@") ? id.slice(1).split(":")[0] : id;
    const homeserver = localStorage.getItem("home_server") || "";
    const masBaseUrl = getMASBaseUrl();
    if (!masBaseUrl) throw new Error("MAS base URL not found");

    // Fetch MAS user data
    const query = filterUndefined({ "page[first]": 10, "filter[search]": username, count: "true" });
    const masUrl = `${masBaseUrl}/api/admin/v1/users?${new URLSearchParams(query as Record<string, string>).toString()}`;
    const { json } = await jsonClient(masUrl);

    const items: MASUserResource[] = (json?.data as MASUserResource[]) || [];
    const item = items.find(u => u.attributes.username === username);
    const synapseBaseUrl = localStorage.getItem("base_url") || "";
    const mxid = `@${username}:${homeserver}`;
    const matrixId = encodeURIComponent(mxid);

    if (!item) {
      // Returns a Synapse-only record so the edit page renders for users MAS doesn't manage (e.g. appservice).
      const { json: synapseJson } = await jsonClient(`${synapseBaseUrl}/_synapse/admin/v2/users/${matrixId}`);
      return {
        id: mxid,
        name: mxid,
        mas_id: undefined,
        username,
        admin: !!synapseJson.admin,
        deactivated: !!synapseJson.deactivated,
        locked: false,
        created_at: undefined,
        locked_at: null,
        deactivated_at: null,
        legacy_guest: undefined,
        is_guest: !!synapseJson.is_guest,
        erased: !!synapseJson.erased,
        shadow_banned: !!synapseJson.shadow_banned,
        suspended: !!synapseJson.suspended,
        avatar_src: synapseJson.avatar_url ?? null,
        displayname: synapseJson.displayname ?? null,
        user_type: synapseJson.user_type ?? null,
        appservice_id: synapseJson.appservice_id ?? null,
        creation_ts_ms: normalizeTS(synapseJson.creation_ts),
      };
    }

    const masRecord = { ...mapMASUserItem(item, homeserver), id: mxid };

    // Merge Synapse profile data (avatar, displayname, creation_ts_ms, suspended, shadow_banned)
    try {
      const { json: synapseJson } = await jsonClient(`${synapseBaseUrl}/_synapse/admin/v2/users/${matrixId}`);
      return {
        ...masRecord,
        // Crown shows if flagged admin on either surface (Synapse homeserver-admin OR MAS can_request_admin).
        admin: !!synapseJson.admin || !!masRecord.admin,
        avatar_src: synapseJson.avatar_url ?? null,
        displayname: synapseJson.displayname ?? null,
        user_type: synapseJson.user_type ?? null,
        appservice_id: synapseJson.appservice_id ?? null,
        // Normalize across Synapse user endpoints before the value reaches the UI.
        creation_ts_ms: normalizeTS(synapseJson.creation_ts),
        suspended: !!synapseJson.suspended,
        shadow_banned: !!synapseJson.shadow_banned,
      };
    } catch {
      // Synapse data unavailable; return MAS-only record; UI gracefully shows what it has
      return masRecord;
    }
  },
  create: (params: RaRecord) => ({
    endpoint: "/api/admin/v1/users",
    body: {
      username:
        params.username ||
        (String(params.id || "").startsWith("@") ? String(params.id).slice(1).split(":")[0] : params.id),
    },
    method: "POST",
  }),
  handleCreateResponse: (item: { data: MASUserResource }) => {
    const homeserver = localStorage.getItem("home_server") || "";
    return { ...mapMASUserItem(item.data, homeserver), id: `@${item.data.attributes.username}:${homeserver}` };
  },
  // Re-fetches the merged record after beforeUpdate's MAS calls; Synapse-only users PUT via v2 first.
  update: async (params: UpdateParams) => {
    const masBaseUrl = getMASBaseUrl();
    const synapseBaseUrl = localStorage.getItem("base_url") || "";
    const homeserver = localStorage.getItem("home_server") || "";
    const masId = params.previousData.mas_id as string | undefined;
    const id = String(params.id);
    const factory = getMASUsersAsMainResource();

    if (masId && masBaseUrl) {
      const { json } = await jsonClient(`${masBaseUrl}/api/admin/v1/users/${masId}`);
      const item: MASUserResource = (json?.data ?? json) as MASUserResource;
      const masRecord = { ...mapMASUserItem(item, homeserver), id };
      try {
        const { json: synapseJson } = await jsonClient(
          `${synapseBaseUrl}/_synapse/admin/v2/users/${encodeURIComponent(id)}`
        );
        return {
          ...masRecord,
          // Crown shows if flagged admin on either surface (Synapse homeserver-admin OR MAS can_request_admin).
          admin: !!synapseJson.admin || !!masRecord.admin,
          avatar_src: synapseJson.avatar_url ?? null,
          displayname: synapseJson.displayname ?? null,
          user_type: synapseJson.user_type ?? null,
          appservice_id: synapseJson.appservice_id ?? null,
          creation_ts_ms: normalizeTS(synapseJson.creation_ts),
          suspended: !!synapseJson.suspended,
          shadow_banned: !!synapseJson.shadow_banned,
        };
      } catch {
        return masRecord;
      }
    }

    // Synapse-only user in MAS mode; admin/locked/deactivated routed through Synapse v2.
    const body: Record<string, unknown> = {};
    const data = params.data as Record<string, unknown>;
    const prev = params.previousData as Record<string, unknown>;
    if (data.admin !== undefined && data.admin !== prev.admin) body.admin = !!data.admin;
    if (data.locked !== undefined && data.locked !== prev.locked) body.locked = !!data.locked;
    if (data.deactivated !== undefined && data.deactivated !== prev.deactivated) body.deactivated = !!data.deactivated;
    if (data.displayname !== undefined && data.displayname !== prev.displayname)
      body.displayname = data.displayname ?? "";
    // beforeUpdate's fall-through stores uploads/erases in avatar_url, the Synapse v2 transport field.
    if (data.avatar_url !== undefined && data.avatar_url !== prev.avatar_src) body.avatar_url = data.avatar_url ?? "";
    if (data.user_type !== undefined && data.user_type !== prev.user_type) body.user_type = data.user_type;

    if (Object.keys(body).length > 0) {
      await jsonClient(`${synapseBaseUrl}/_synapse/admin/v2/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    }

    return factory.getOne({ id });
  },
  // mas_id: previousData, else meta.records; omitting meta.records on bulk-delete silently skips MAS revoke.
  delete: async (params: DeleteParams) => {
    const masBaseUrl = getMASBaseUrl();
    const synapseBaseUrl = localStorage.getItem("base_url") || "";
    const id = String(params.id);

    const previousMasId = (params.previousData as { mas_id?: string } | undefined)?.mas_id;
    // records MUST be an Array<{id, mas_id}>; a plain-object map silently falls back to Synapse v2 PUT.
    const metaRecords = (params.meta as { records?: unknown } | undefined)?.records;
    const fromMeta = Array.isArray(metaRecords)
      ? (metaRecords as { id?: unknown; mas_id?: string }[]).find(r => r && String(r.id) === id)?.mas_id
      : undefined;
    const masId = previousMasId ?? fromMeta;

    if (masId && masBaseUrl) {
      await jsonClient(`${masBaseUrl}/api/admin/v1/users/${encodeURIComponent(masId)}/deactivate`, {
        method: "POST",
      });
    } else {
      await jsonClient(`${synapseBaseUrl}/_synapse/admin/v2/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ deactivated: true }),
      });
    }
    return { ...(params.previousData || {}), id, deactivated: true };
  },
});

export const getMASUserEmailsResource = () => ({
  path: "/api/admin/v1/user-emails",
  isMAS: true,
  map: (item: MASUserEmailResource | { data: MASUserEmailResource }) => {
    const e = "data" in item ? item.data : item;
    return {
      id: e.id,
      email: e.attributes.email,
      user_id: e.attributes.user_id,
      created_at: e.attributes.created_at,
    };
  },
  data: "data",
  total: (json: MASUserEmailListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[user]": filter.user_id,
      "filter[email]": filter.email,
      count: "true",
    }),
  create: (params: RaRecord) => ({
    endpoint: "/api/admin/v1/user-emails",
    body: { user_id: params.user_id, email: params.email },
    method: "POST",
  }),
  handleCreateResponse: (item: { data: MASUserEmailResource }) => {
    const e = item.data;
    return { id: e.id, email: e.attributes.email, user_id: e.attributes.user_id, created_at: e.attributes.created_at };
  },
  delete: (params: DeleteParams) => ({
    endpoint: `/api/admin/v1/user-emails/${params.id}`,
    method: "DELETE",
  }),
});

export const getMASCompatSessionsResource = () => ({
  path: "/api/admin/v1/compat-sessions",
  isMAS: true,
  map: (item: MASCompatSessionResource | { data: MASCompatSessionResource }) => {
    const s = "data" in item ? item.data : item;
    return {
      id: s.id,
      user_id: s.attributes.user_id,
      device_id: s.attributes.device_id,
      created_at: s.attributes.created_at,
      user_agent: s.attributes.user_agent,
      last_active_at: s.attributes.last_active_at,
      last_active_ip: s.attributes.last_active_ip,
      finished_at: s.attributes.finished_at,
      human_name: s.attributes.human_name,
      active: !s.attributes.finished_at,
    };
  },
  data: "data",
  total: (json: MASCompatSessionListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[user]": filter.user_id,
      "filter[status]": filter.status,
      count: "true",
    }),
});

export const getMASAuth2SessionsResource = () => ({
  path: "/api/admin/v1/oauth2-sessions",
  isMAS: true,
  map: (item: MASOAuth2SessionResource | { data: MASOAuth2SessionResource }) => {
    const s = "data" in item ? item.data : item;
    return {
      id: s.id,
      user_id: s.attributes.user_id,
      client_id: s.attributes.client_id,
      scope: s.attributes.scope,
      created_at: s.attributes.created_at,
      finished_at: s.attributes.finished_at,
      user_agent: s.attributes.user_agent,
      last_active_at: s.attributes.last_active_at,
      last_active_ip: s.attributes.last_active_ip,
      human_name: s.attributes.human_name,
      active: !s.attributes.finished_at,
    };
  },
  data: "data",
  total: (json: MASOAuth2SessionListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[user]": filter.user_id,
      "filter[status]": filter.status,
      count: "true",
    }),
});

export const getMASPersonalSessionsResource = () => ({
  path: "/api/admin/v1/personal-sessions",
  isMAS: true,
  map: (item: MASPersonalSessionResource | { data: MASPersonalSessionResource }) => {
    const s = "data" in item ? item.data : item;
    return {
      id: s.id,
      owner_user_id: s.attributes.owner_user_id,
      human_name: s.attributes.human_name,
      scope: s.attributes.scope,
      created_at: s.attributes.created_at,
      revoked_at: s.attributes.revoked_at,
      last_active_at: s.attributes.last_active_at,
      last_active_ip: s.attributes.last_active_ip,
      expires_at: s.attributes.expires_at,
      active: !s.attributes.revoked_at,
    };
  },
  data: "data",
  total: (json: MASPersonalSessionListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[user]": filter.user_id,
      "filter[status]": filter.status,
      count: "true",
    }),
  create: (params: RaRecord) => ({
    endpoint: "/api/admin/v1/personal-sessions",
    body: filterUndefined({
      actor_user_id: params.actor_user_id,
      scope: params.scope,
      human_name: params.human_name,
      expires_in: params.expires_in ? Number(params.expires_in) : undefined,
    }),
    method: "POST",
  }),
  handleCreateResponse: (item: { data: MASPersonalSessionResource }) => {
    const s = item.data;
    return {
      id: s.id,
      owner_user_id: s.attributes.owner_user_id,
      human_name: s.attributes.human_name,
      scope: s.attributes.scope,
      created_at: s.attributes.created_at,
      revoked_at: s.attributes.revoked_at,
      last_active_at: s.attributes.last_active_at,
      last_active_ip: s.attributes.last_active_ip,
      expires_at: s.attributes.expires_at,
      active: !s.attributes.revoked_at,
      access_token: s.attributes.access_token,
    };
  },
  delete: (params: DeleteParams) => ({
    endpoint: `/api/admin/v1/personal-sessions/${params.id}/revoke`,
    method: "POST",
  }),
});

export const getMASUserSessionsResource = () => ({
  path: "/api/admin/v1/user-sessions",
  isMAS: true,
  map: (item: MASUserSessionResource | { data: MASUserSessionResource }) => {
    const s = "data" in item ? item.data : item;
    return {
      id: s.id,
      user_id: s.attributes.user_id,
      created_at: s.attributes.created_at,
      finished_at: s.attributes.finished_at,
      user_agent: s.attributes.user_agent,
      last_active_at: s.attributes.last_active_at,
      last_active_ip: s.attributes.last_active_ip,
      active: !s.attributes.finished_at,
    };
  },
  data: "data",
  total: (json: MASUserSessionListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[user]": filter.user_id,
      "filter[status]": filter.status,
      count: "true",
    }),
});

export const getMASUpstreamOAuthLinksResource = () => ({
  path: "/api/admin/v1/upstream-oauth-links",
  isMAS: true,
  map: (item: MASUpstreamOAuthLinkResource | { data: MASUpstreamOAuthLinkResource }) => {
    const l = "data" in item ? item.data : item;
    return {
      id: l.id,
      user_id: l.attributes.user_id,
      provider_id: l.attributes.provider_id,
      subject: l.attributes.subject,
      human_account_name: l.attributes.human_account_name,
      created_at: l.attributes.created_at,
    };
  },
  data: "data",
  total: (json: MASUpstreamOAuthLinkListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[user]": filter.user_id,
      "filter[provider]": filter.provider_id,
      count: "true",
    }),
  create: (params: RaRecord) => ({
    endpoint: "/api/admin/v1/upstream-oauth-links",
    body: filterUndefined({
      user_id: params.user_id,
      provider_id: params.provider_id,
      subject: params.subject,
      human_account_name: params.human_account_name || undefined,
    }),
    method: "POST",
  }),
  handleCreateResponse: (item: { data: MASUpstreamOAuthLinkResource }) => {
    const l = item.data;
    return {
      id: l.id,
      user_id: l.attributes.user_id,
      provider_id: l.attributes.provider_id,
      subject: l.attributes.subject,
      human_account_name: l.attributes.human_account_name,
      created_at: l.attributes.created_at,
    };
  },
  delete: (params: DeleteParams) => ({
    endpoint: `/api/admin/v1/upstream-oauth-links/${params.id}`,
    method: "DELETE",
  }),
});

export const getMASUpstreamOAuthProvidersResource = () => ({
  path: "/api/admin/v1/upstream-oauth-providers",
  isMAS: true,
  map: (item: MASUpstreamOAuthProviderResource | { data: MASUpstreamOAuthProviderResource }) => {
    const p = "data" in item ? item.data : item;
    return {
      id: p.id,
      issuer: p.attributes.issuer,
      human_name: p.attributes.human_name,
      brand_name: p.attributes.brand_name,
      created_at: p.attributes.created_at,
      disabled_at: p.attributes.disabled_at,
      enabled: !p.attributes.disabled_at,
    };
  },
  data: "data",
  total: (json: MASUpstreamOAuthProviderListResponse) => json.meta?.count || 0,
  buildListQuery: (perPage: number, cursor: string | undefined, filter: Record<string, any>) =>
    filterUndefined({
      "page[first]": perPage,
      "page[after]": cursor,
      "filter[enabled]": filter.enabled,
      count: "true",
    }),
});

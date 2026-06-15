/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./mas-utils", async () => {
  const actual = await vi.importActual<typeof import("./mas-utils")>("./mas-utils");
  return { ...actual, isMAS: vi.fn() };
});

vi.mock("../http", () => ({
  jsonClient: vi.fn(),
}));

vi.mock("./synapse-actions", () => ({
  deleteUserMedia: vi.fn(),
}));

vi.mock("./synapse", () => ({
  invalidateManyRefCache: vi.fn(),
}));

import { wrapWithLifecycle } from "./lifecycle";
import { isMAS } from "./mas-utils";
import { jsonClient } from "../http";
import { getMASUsersAsMainResource } from "./mas";

interface MockBase {
  masSetAdmin: ReturnType<typeof vi.fn>;
  masLockUser: ReturnType<typeof vi.fn>;
  masDeactivateUser: ReturnType<typeof vi.fn>;
  suspendUser: ReturnType<typeof vi.fn>;
  shadowBanUser: ReturnType<typeof vi.fn>;
  uploadMedia: ReturnType<typeof vi.fn>;
  setRateLimits: ReturnType<typeof vi.fn>;
  eraseUser: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

const makeBase = (): MockBase => ({
  masSetAdmin: vi.fn().mockResolvedValue({}),
  masLockUser: vi.fn().mockResolvedValue({}),
  masDeactivateUser: vi.fn().mockResolvedValue({}),
  suspendUser: vi.fn().mockResolvedValue({}),
  shadowBanUser: vi.fn().mockResolvedValue({}),
  uploadMedia: vi.fn().mockResolvedValue({ content_uri: "mxc://h/m" }),
  setRateLimits: vi.fn().mockResolvedValue({}),
  eraseUser: vi.fn().mockResolvedValue({ success: true }),
  update: vi.fn().mockResolvedValue({ data: { id: "@u:hs" } }),
});

const SYNAPSE_BASE = "https://synapse.example.com";
const HOMESERVER = "hs.example.com";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("base_url", SYNAPSE_BASE);
  localStorage.setItem("home_server", HOMESERVER);
  localStorage.setItem("token_endpoint", "https://mas.example.com/oauth2/token");
  vi.mocked(isMAS).mockReturnValue(false);
  vi.mocked(jsonClient).mockResolvedValue({ json: {} } as any);
});

describe("lifecycle.beforeUpdate: MAS mode, no mas_id (Synapse-only user)", () => {
  beforeEach(() => {
    vi.mocked(isMAS).mockReturnValue(true);
  });

  it("does not dispatch MAS action calls when admin/locked/deactivated change", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@bot:hs",
      previousData: { id: "@bot:hs", mas_id: undefined, admin: false, locked: false, deactivated: false },
      data: { id: "@bot:hs", admin: true, locked: true, deactivated: true },
    });

    expect(base.masSetAdmin).not.toHaveBeenCalled();
    expect(base.masLockUser).not.toHaveBeenCalled();
    expect(base.masDeactivateUser).not.toHaveBeenCalled();
  });

  it("still dispatches suspend/shadowBan when those fields change", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@bot:hs",
      previousData: { id: "@bot:hs", mas_id: undefined, suspended: false, shadow_banned: false },
      data: { id: "@bot:hs", suspended: true, shadow_banned: true },
    });

    expect(base.suspendUser).toHaveBeenCalledWith("@bot:hs", true);
    expect(base.shadowBanUser).toHaveBeenCalledWith("@bot:hs", true);
  });
});

describe("lifecycle.beforeUpdate: MAS mode, with mas_id (regression guard)", () => {
  beforeEach(() => {
    vi.mocked(isMAS).mockReturnValue(true);
  });

  it("dispatches MAS action calls for admin/locked/deactivated changes", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@alice:hs",
      previousData: {
        id: "@alice:hs",
        mas_id: "01HABCDEFULID",
        admin: false,
        locked: false,
        deactivated: false,
      },
      data: { id: "@alice:hs", admin: true, locked: true, deactivated: true },
    });

    expect(base.masSetAdmin).toHaveBeenCalledWith("01HABCDEFULID", true);
    expect(base.masLockUser).toHaveBeenCalledWith("01HABCDEFULID", true);
    // masDeactivateUser(masId, active): false = deactivate
    expect(base.masDeactivateUser).toHaveBeenCalledWith("01HABCDEFULID", false);
  });

  it("also dispatches suspend/shadowBan inside the MAS branch when those fields change", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@alice:hs",
      previousData: {
        id: "@alice:hs",
        mas_id: "01HABCDEFULID",
        suspended: false,
        shadow_banned: false,
      },
      data: { id: "@alice:hs", suspended: true, shadow_banned: true },
    });

    expect(base.suspendUser).toHaveBeenCalledWith("@alice:hs", true);
    expect(base.shadowBanUser).toHaveBeenCalledWith("@alice:hs", true);
  });
});

describe("getMASUsersAsMainResource.update", () => {
  it("(no mas_id) PUTs diffed fields to Synapse v2, then re-fetches via getOne", async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method, body: opts?.body });
      // getOne's MAS lookup returns empty data → Synapse-only branch
      if (url.includes("/api/admin/v1/users?")) return { json: { data: [] } } as any;
      // getOne's Synapse v2 GET
      if (opts?.method === undefined && url.includes("/_synapse/admin/v2/users/")) {
        return {
          json: {
            admin: true,
            deactivated: false,
            displayname: "Bot",
            avatar_url: null,
            creation_ts: 0,
          },
        } as any;
      }
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    await res.update({
      id: "@bot:hs.example.com",
      previousData: { id: "@bot:hs.example.com", mas_id: undefined, admin: false } as any,
      data: { id: "@bot:hs.example.com", admin: true } as any,
    });

    const synapsePuts = calls.filter(c => c.method === "PUT" && c.url.includes("/_synapse/admin/v2/users/"));
    expect(synapsePuts).toHaveLength(1);
    expect(JSON.parse(synapsePuts[0].body || "{}")).toEqual({ admin: true });

    // No MAS user GET to /api/admin/v1/users/<ulid>
    expect(calls.some(c => /\/api\/admin\/v1\/users\/[^?/]+$/.test(c.url))).toBe(false);
  });

  it("(with mas_id) issues MAS GET by ULID + Synapse v2 profile merge GET", async () => {
    const calls: string[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string) => {
      calls.push(url);
      if (url.includes("/api/admin/v1/users/01HABCDEFULID")) {
        return {
          json: { data: { id: "01HABCDEFULID", attributes: { username: "alice" } } },
        } as any;
      }
      if (url.includes("/_synapse/admin/v2/users/")) {
        return {
          json: { admin: false, displayname: "Alice", avatar_url: null, creation_ts: 0 },
        } as any;
      }
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    await res.update({
      id: "@alice:hs.example.com",
      previousData: { id: "@alice:hs.example.com", mas_id: "01HABCDEFULID" } as any,
      data: { id: "@alice:hs.example.com" } as any,
    });

    expect(calls.some(u => u.includes("/api/admin/v1/users/01HABCDEFULID"))).toBe(true);
    expect(calls.some(u => u.includes("/_synapse/admin/v2/users/"))).toBe(true);
  });
});

describe("getMASUsersAsMainResource.delete", () => {
  it("(with mas_id) POSTs to the MAS deactivate endpoint", async () => {
    const calls: { url: string; method?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method });
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    const result = await res.delete({
      id: "@alice:hs.example.com",
      previousData: { id: "@alice:hs.example.com", mas_id: "01HABCDEFULID", deactivated: false } as any,
    });

    const masDeactivates = calls.filter(
      c => c.method === "POST" && /\/api\/admin\/v1\/users\/[^/]+\/deactivate$/.test(c.url)
    );
    expect(masDeactivates).toHaveLength(1);
    expect(masDeactivates[0].url).toContain("/api/admin/v1/users/01HABCDEFULID/deactivate");

    // No Synapse v2 PUT fallback when mas_id is present
    const synapsePuts = calls.filter(c => c.method === "PUT" && c.url.includes("/_synapse/admin/v2/users/"));
    expect(synapsePuts).toHaveLength(0);

    expect(result.deactivated).toBe(true);
    expect(result.id).toBe("@alice:hs.example.com");
    // previousData spread is preserved: RA's local cache needs the full record.
    expect(result.mas_id).toBe("01HABCDEFULID");
  });

  it("(no mas_id) PUTs {deactivated:true} to Synapse v2 admin users", async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method, body: opts?.body });
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    const result = await res.delete({
      id: "@bot:hs.example.com",
      previousData: { id: "@bot:hs.example.com", mas_id: undefined, deactivated: false } as any,
    });

    const synapsePuts = calls.filter(c => c.method === "PUT" && c.url.includes("/_synapse/admin/v2/users/"));
    expect(synapsePuts).toHaveLength(1);
    expect(JSON.parse(synapsePuts[0].body || "{}")).toEqual({ deactivated: true });

    // No MAS deactivate call when mas_id is absent
    expect(calls.some(c => /\/api\/admin\/v1\/users\/[^/]+\/deactivate$/.test(c.url))).toBe(false);

    expect(result.deactivated).toBe(true);
    expect(result.id).toBe("@bot:hs.example.com");
  });

  it("idempotency (with mas_id): two runs produce exactly one side-effect per run, same shape", async () => {
    const calls: { url: string; method?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method });
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    const params = {
      id: "@alice:hs.example.com",
      previousData: { id: "@alice:hs.example.com", mas_id: "01HABCDEFULID" } as any,
    };

    await res.delete(params);
    expect(calls).toHaveLength(1);

    await res.delete(params);
    expect(calls).toHaveLength(2);
    // Same call shape both times; no fan-out, no accumulation.
    expect(calls[0].url).toBe(calls[1].url);
    expect(calls[0].method).toBe(calls[1].method);
  });

  it("(deleteMany shape) reads mas_id from meta.records when previousData is absent", async () => {
    const calls: { url: string; method?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method });
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    // Simulates the per-id invocation inside dataProvider.deleteMany when a caller passes
    // meta.records to thread per-record mas_id through. DeleteManyParams carries no
    // previousData by contract; see ra-core types.d.ts:185.
    const result = await res.delete({
      id: "@alice:hs.example.com",
      meta: {
        records: [
          { id: "@alice:hs.example.com", mas_id: "01HABCDEFULID" },
          { id: "@bot:hs.example.com", mas_id: undefined },
        ],
      },
    } as any);

    const masDeactivates = calls.filter(
      c => c.method === "POST" && /\/api\/admin\/v1\/users\/[^/]+\/deactivate$/.test(c.url)
    );
    expect(masDeactivates).toHaveLength(1);
    expect(masDeactivates[0].url).toContain("/api/admin/v1/users/01HABCDEFULID/deactivate");

    // No Synapse v2 PUT fallback when meta.records resolved mas_id.
    const synapsePuts = calls.filter(c => c.method === "PUT" && c.url.includes("/_synapse/admin/v2/users/"));
    expect(synapsePuts).toHaveLength(0);

    expect(result.deactivated).toBe(true);
    expect(result.id).toBe("@alice:hs.example.com");
  });

  it("(deleteMany shape, no mas_id in meta) falls through to Synapse v2 PUT", async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method, body: opts?.body });
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    await res.delete({
      id: "@bot:hs.example.com",
      meta: { records: [{ id: "@bot:hs.example.com", mas_id: undefined }] },
    } as any);

    const synapsePuts = calls.filter(c => c.method === "PUT" && c.url.includes("/_synapse/admin/v2/users/"));
    expect(synapsePuts).toHaveLength(1);
    expect(JSON.parse(synapsePuts[0].body || "{}")).toEqual({ deactivated: true });

    // No MAS deactivate call when mas_id is absent from both sources.
    expect(calls.some(c => /\/api\/admin\/v1\/users\/[^/]+\/deactivate$/.test(c.url))).toBe(false);
  });

  it("idempotency (no mas_id): two runs produce exactly one Synapse PUT per run, same shape", async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    vi.mocked(jsonClient).mockImplementation(async (url: string, opts?: any) => {
      calls.push({ url, method: opts?.method, body: opts?.body });
      return { json: {} } as any;
    });

    const res = getMASUsersAsMainResource();
    const params = {
      id: "@bot:hs.example.com",
      previousData: { id: "@bot:hs.example.com", mas_id: undefined } as any,
    };

    await res.delete(params);
    expect(calls).toHaveLength(1);

    await res.delete(params);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(calls[1].url);
    expect(calls[0].method).toBe("PUT");
    expect(JSON.parse(calls[0].body || "{}")).toEqual({ deactivated: true });
  });
});

describe("lifecycle.beforeUpdate: Synapse-only mode, erase guard", () => {
  // Regression for the catastrophic bug: deactivated + erased are present on every user record,
  // so the old `!== undefined` guard fired eraseUser on every save. The guard must only fire when
  // both flags are explicitly true AND actually changed.
  it("does NOT erase on a routine edit (displayname change, deactivated/erased unchanged)", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@bob:hs",
      previousData: { id: "@bob:hs", displayname: "Bob", deactivated: false, erased: false },
      data: { id: "@bob:hs", displayname: "Bobby", deactivated: false, erased: false },
    });

    expect(base.eraseUser).not.toHaveBeenCalled();
    // The profile PUT proceeds normally; no skip signal set.
    expect(base.update).toHaveBeenCalledTimes(1);
    expect(base.update.mock.calls[0][1].meta?.userErased).toBeFalsy();
  });

  it("does NOT erase when only deactivating (deactivated true, erased false); deactivate flows to the PUT", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@bob:hs",
      previousData: { id: "@bob:hs", deactivated: false, erased: false },
      data: { id: "@bob:hs", deactivated: true, erased: false },
    });

    expect(base.eraseUser).not.toHaveBeenCalled();
    // deactivated stays in data so the base PUT carries it (plain deactivate, no erase).
    expect(base.update.mock.calls[0][1].data.deactivated).toBe(true);
  });

  it("erases exactly once when the operator sets deactivated+erased (false → true), then signals skip", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    await wrap.update("users", {
      id: "@bob:hs",
      previousData: { id: "@bob:hs", deactivated: false, erased: false },
      data: { id: "@bob:hs", deactivated: true, erased: true },
    });

    expect(base.eraseUser).toHaveBeenCalledTimes(1);
    expect(base.eraseUser).toHaveBeenCalledWith("@bob:hs");
    // beforeUpdate can't cancel the base update; it signals it to skip the doomed PUT instead.
    expect(base.update.mock.calls[0][1].meta.userErased).toBe(true);
  });

  it("idempotency: erase fires exactly once across two sequential saves (second sees already-erased state)", async () => {
    const base = makeBase();
    const wrap = wrapWithLifecycle(base as any);

    // First save: operator deactivates + erases.
    await wrap.update("users", {
      id: "@bob:hs",
      previousData: { id: "@bob:hs", deactivated: false, erased: false },
      data: { id: "@bob:hs", deactivated: true, erased: true },
    });
    // Second save: the record is now erased; RA's previousData reflects it, so no re-fire.
    await wrap.update("users", {
      id: "@bob:hs",
      previousData: { id: "@bob:hs", deactivated: true, erased: true },
      data: { id: "@bob:hs", deactivated: true, erased: true, displayname: "x" },
    });

    expect(base.eraseUser).toHaveBeenCalledTimes(1);
  });

  it("rejects without faking success when eraseUser reports failure, and skips the PUT", async () => {
    const base = makeBase();
    base.eraseUser.mockResolvedValueOnce({ success: false, error: "boom" });
    const wrap = wrapWithLifecycle(base as any);

    await expect(
      wrap.update("users", {
        id: "@bob:hs",
        previousData: { id: "@bob:hs", deactivated: false, erased: false },
        data: { id: "@bob:hs", deactivated: true, erased: true },
      })
    ).rejects.toThrow("boom");

    // The erase failed → the account still exists → we must not silently proceed.
    expect(base.update).not.toHaveBeenCalled();
  });
});

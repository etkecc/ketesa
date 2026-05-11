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
  eraseUser: vi.fn().mockResolvedValue({}),
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

describe("lifecycle.beforeUpdate — MAS mode, no mas_id (Synapse-only user)", () => {
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

describe("lifecycle.beforeUpdate — MAS mode, with mas_id (regression guard)", () => {
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

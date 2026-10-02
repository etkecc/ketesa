vi.mock("../matrix", async () => ({
  ...(await vi.importActual("../matrix")),
  refreshAccessToken: vi.fn().mockResolvedValue(undefined),
}));

import dataProvider from "./index";
import { clearSystemUsersScanCache, clearReverseSearchScanCache, clearMASFilterScanCache } from "./index";
import { LoadConfig } from "../../utils/config";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("base_url", "http://localhost");
  localStorage.setItem("access_token", "access_token");
  clearSystemUsersScanCache();
  clearReverseSearchScanCache();
  clearMASFilterScanCache();
  LoadConfig({
    restrictBaseUrl: "",
    corsCredentials: "same-origin",
    asManagedUsers: [],
    menu: [],
    etkeccAdmin: "",
  });
});

describe("dataProvider", () => {
  it("fetches all users", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          users: [
            {
              name: "@user_id1:provider",
              password_hash: "password_hash1",
              is_guest: 0,
              admin: 0,
              user_type: null,
              deactivated: 0,
              displayname: "User One",
            },
            {
              name: "@user_id2:provider",
              password_hash: "password_hash2",
              is_guest: 0,
              admin: 1,
              user_type: null,
              deactivated: 0,
              displayname: "User Two",
            },
          ],
          next_token: "100",
          total: 200,
        })
      )
    );

    const users = await dataProvider.getList("users", {
      pagination: { page: 1, perPage: 5 },
      sort: { field: "title", order: "ASC" },
      filter: { author_id: 12 },
    });

    expect(users.data[0].id).toEqual("@user_id1:provider");
    expect(users.total).toEqual(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches one user", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "@user_id1:provider",
          password: "user_password",
          displayname: "User",
          threepids: [
            {
              medium: "email",
              address: "user@mail_1.com",
            },
            {
              medium: "email",
              address: "user@mail_2.com",
            },
          ],
          avatar_url: "mxc://localhost/user1",
          admin: false,
          deactivated: false,
          creation_ts: 1560432506,
        })
      )
    );

    const user = await dataProvider.getOne("users", { id: "@user_id1:provider" });

    expect(user.data.id).toEqual("@user_id1:provider");
    expect(user.data.displayname).toEqual("User");
    expect(user.data.creation_ts_ms).toEqual(1560432506000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps Synapse list creation_ts values in milliseconds", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          users: [
            {
              name: "@user_id1:provider",
              is_guest: 0,
              admin: 0,
              user_type: null,
              deactivated: 0,
              displayname: "User One",
              creation_ts: 1560432668000,
            },
          ],
          total: 1,
        })
      )
    );

    const users = await dataProvider.getList("users", {
      pagination: { page: 1, perPage: 5 },
      sort: { field: "name", order: "ASC" },
      filter: {},
    });

    expect(users.data[0].creation_ts_ms).toEqual(1560432668000);
  });

  it("skips MAS availability check when no access token", async () => {
    localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
    localStorage.removeItem("access_token");

    // isMAS() reads RaStore.isMAS, which is not set, so registration_tokens stays Synapse
    const { initResources } = await import("./index");
    initResources();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses MAS pagination cursor on page 2", async () => {
    vi.resetModules();
    // Re-import after reset so MAS registration tokens init isn't cached from prior tests.
    const { default: freshDataProvider } = await import("./index");

    localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
    // Set the cached MAS flag so the resource is detected as MAS
    localStorage.setItem("RaStore.isMAS", "true");

    // Re-init registration tokens with the MAS flag set
    const { initResources } = await import("./index");
    initResources();

    const masListPage1 = {
      links: {
        self: "/api/admin/v1/user-registration-tokens?page%5Bafter%5D=01JB4PAPAMESEFX6CNP1JA5M6V&page%5Bfirst%5D=10",
        first: "/api/admin/v1/user-registration-tokens?page%5Bfirst%5D=10",
        last: "/api/admin/v1/user-registration-tokens?page%5Bafter%5D=01JB4PAPG3N9FS0YVQTMYV0NG&page%5Bfirst%5D=10",
        next: "/api/admin/v1/user-registration-tokens?page%5Bafter%5D=01JB4PAPAMESEFX6CNP1JA5M6V&page%5Bfirst%5D=10",
        prev: null,
      },
      data: [
        {
          type: "user-registration-token",
          id: "01JB4PAPAMESEFX6CNP1JA5M6V",
          attributes: {
            token: "5lQl96lyEJwMRx1c1Vx0Q2O93",
            valid: true,
            usage_limit: null,
            times_used: 0,
            created_at: "2024-06-10T10:12:21.184Z",
            last_used_at: null,
            expires_at: null,
            revoked_at: null,
          },
        },
      ],
      meta: {
        count: 1,
      },
    };

    const masListPage2 = {
      links: {
        self: "/api/admin/v1/user-registration-tokens?page%5Bafter%5D=01JB4PAPG3N9FS0YVQTMYV0NG&page%5Bfirst%5D=10",
        first: "/api/admin/v1/user-registration-tokens?page%5Bfirst%5D=10",
        last: "/api/admin/v1/user-registration-tokens?page%5Bafter%5D=01JB4PAPG3N9FS0YVQTMYV0NG&page%5Bfirst%5D=10",
        next: null,
        prev: "/api/admin/v1/user-registration-tokens?page%5Bbefore%5D=01JB4PAPG3N9FS0YVQTMYV0NG&page%5Bfirst%5D=10",
      },
      data: [],
      meta: {
        count: 1,
      },
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(masListPage1)))
      .mockResolvedValueOnce(new Response(JSON.stringify(masListPage2)));

    await freshDataProvider.getList("registration_tokens", {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "token", order: "ASC" },
      filter: { valid: true },
    });

    await freshDataProvider.getList("registration_tokens", {
      pagination: { page: 2, perPage: 10 },
      sort: { field: "token", order: "ASC" },
      filter: { valid: true },
    });

    const [page2Url] = vi.mocked(fetch).mock.calls[1];
    expect(page2Url).toContain("http://mas.example/api/admin/v1/user-registration-tokens?");
    expect(page2Url).toContain("page%5Bfirst%5D=10");
    expect(page2Url).toContain("page%5Bafter%5D=01JB4PAPAMESEFX6CNP1JA5M6V");
    expect(page2Url).toContain("filter%5Bvalid%5D=true");
  });
  it("filters MAS users by status=locked using the MAS-merged state", async () => {
    vi.resetModules();
    const { default: freshDataProvider } = await import("./index");
    localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
    localStorage.setItem("RaStore.isMAS", "true");
    localStorage.setItem("home_server", "hs");
    const { initResources } = await import("./index");
    initResources();

    const masList = {
      data: [
        {
          type: "user",
          id: "ulid-alice",
          links: { self: "/api/admin/v1/users/ulid-alice" },
          attributes: {
            username: "alice",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: "2024-01-02T00:00:00Z",
            deactivated_at: null,
            admin: false,
            legacy_guest: false,
          },
        },
        {
          type: "user",
          id: "ulid-bob",
          links: { self: "/api/admin/v1/users/ulid-bob" },
          attributes: {
            username: "bob",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: null,
            admin: false,
            legacy_guest: false,
          },
        },
        {
          type: "user",
          id: "ulid-carol",
          links: { self: "/api/admin/v1/users/ulid-carol" },
          attributes: {
            username: "carol",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: "2024-01-02T00:00:00Z",
            admin: false,
            legacy_guest: false,
          },
        },
      ],
      links: { next: null },
      meta: { count: 3 },
    };
    const synapseUsers = {
      users: [
        { name: "@alice:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Alice" },
        { name: "@bob:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Bob" },
        { name: "@carol:hs", is_guest: 0, admin: 0, deactivated: 1, locked: 0, displayname: "Carol" },
      ],
      total: 3,
    };
    const aliceProfile = {
      name: "@alice:hs",
      admin: 0,
      deactivated: 0,
      locked: 0,
      displayname: "Alice",
      avatar_url: null,
      is_guest: 0,
      shadow_banned: 0,
      erased: 0,
      suspended: 0,
      creation_ts: 1700000000,
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(masList)))
      .mockResolvedValueOnce(new Response(JSON.stringify(synapseUsers)))
      .mockResolvedValueOnce(new Response(JSON.stringify(aliceProfile)));

    const result = await freshDataProvider.getList("users", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { status: "locked" },
    });

    expect(result.data.map(u => u.id)).toEqual(["@alice:hs"]);
    expect(result.total).toEqual(1);
    const [masUrl, synapseUrl] = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
    expect(masUrl).toContain("http://mas.example/api/admin/v1/users?");
    expect(masUrl).toContain("page%5Bfirst%5D=100");
    expect(synapseUrl).toContain("/_synapse/admin/v3/users?");
    expect(synapseUrl).toContain("locked=true");
    expect(synapseUrl).toContain("guests=false");
  });

  it("filters MAS users by status=active excluding locked and deactivated", async () => {
    vi.resetModules();
    const { default: freshDataProvider } = await import("./index");
    localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
    localStorage.setItem("RaStore.isMAS", "true");
    localStorage.setItem("home_server", "hs");
    const { initResources } = await import("./index");
    initResources();

    const masList = {
      data: [
        {
          type: "user",
          id: "ulid-alice",
          links: { self: "/api/admin/v1/users/ulid-alice" },
          attributes: {
            username: "alice",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: "2024-01-02T00:00:00Z",
            deactivated_at: null,
            admin: false,
            legacy_guest: false,
          },
        },
        {
          type: "user",
          id: "ulid-bob",
          links: { self: "/api/admin/v1/users/ulid-bob" },
          attributes: {
            username: "bob",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: null,
            admin: false,
            legacy_guest: false,
          },
        },
      ],
      links: { next: null },
      meta: { count: 2 },
    };
    const synapseUsers = {
      users: [
        { name: "@alice:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Alice" },
        { name: "@bob:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Bob" },
      ],
      total: 2,
    };
    const bobProfile = {
      name: "@bob:hs",
      admin: 0,
      deactivated: 0,
      locked: 0,
      displayname: "Bob",
      avatar_url: null,
      is_guest: 0,
      shadow_banned: 0,
      erased: 0,
      suspended: 0,
      creation_ts: 1700000000,
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(masList)))
      .mockResolvedValueOnce(new Response(JSON.stringify(synapseUsers)))
      .mockResolvedValueOnce(new Response(JSON.stringify(bobProfile)));

    const result = await freshDataProvider.getList("users", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { status: "active" },
    });

    expect(result.data.map(u => u.id)).toEqual(["@bob:hs"]);
    const [, synapseUrl] = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
    expect(synapseUrl).toContain("locked=true");
    expect(synapseUrl).not.toContain("deactivated=");
  });

  it("filters MAS users by status=deactivated", async () => {
    vi.resetModules();
    const { default: freshDataProvider } = await import("./index");
    localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
    localStorage.setItem("RaStore.isMAS", "true");
    localStorage.setItem("home_server", "hs");
    const { initResources } = await import("./index");
    initResources();

    const masList = {
      data: [
        {
          type: "user",
          id: "ulid-bob",
          links: { self: "/api/admin/v1/users/ulid-bob" },
          attributes: {
            username: "bob",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: null,
            admin: false,
            legacy_guest: false,
          },
        },
        {
          type: "user",
          id: "ulid-carol",
          links: { self: "/api/admin/v1/users/ulid-carol" },
          attributes: {
            username: "carol",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: "2024-01-02T00:00:00Z",
            admin: false,
            legacy_guest: false,
          },
        },
      ],
      links: { next: null },
      meta: { count: 2 },
    };
    const synapseUsers = {
      users: [
        { name: "@bob:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Bob" },
        // carol is MAS-only deactivated: Synapse says active, MAS says deactivated.
        { name: "@carol:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Carol" },
      ],
      total: 2,
    };
    const carolProfile = {
      name: "@carol:hs",
      admin: 0,
      deactivated: 0,
      locked: 0,
      displayname: "Carol",
      avatar_url: null,
      is_guest: 0,
      shadow_banned: 0,
      erased: 0,
      suspended: 0,
      creation_ts: 1700000000,
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(masList)))
      .mockResolvedValueOnce(new Response(JSON.stringify(synapseUsers)))
      .mockResolvedValueOnce(new Response(JSON.stringify(carolProfile)));

    const result = await freshDataProvider.getList("users", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { status: "deactivated" },
    });

    expect(result.data.map(u => u.id)).toEqual(["@carol:hs"]);
    const [, synapseUrl] = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
    expect(synapseUrl).toContain("locked=true");
    expect(synapseUrl).not.toContain("deactivated=");
  });

  it("filters MAS users by admin using the MAS-merged admin state", async () => {
    vi.resetModules();
    const { default: freshDataProvider } = await import("./index");
    localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
    localStorage.setItem("RaStore.isMAS", "true");
    localStorage.setItem("home_server", "hs");
    const { initResources } = await import("./index");
    initResources();

    // alice is MAS-promoted admin only: Synapse v3 says admin=0, MAS says admin=true.
    const masList = {
      data: [
        {
          type: "user",
          id: "ulid-alice",
          links: { self: "/api/admin/v1/users/ulid-alice" },
          attributes: {
            username: "alice",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: null,
            admin: true,
            legacy_guest: false,
          },
        },
        {
          type: "user",
          id: "ulid-bob",
          links: { self: "/api/admin/v1/users/ulid-bob" },
          attributes: {
            username: "bob",
            created_at: "2024-01-01T00:00:00Z",
            locked_at: null,
            deactivated_at: null,
            admin: false,
            legacy_guest: false,
          },
        },
      ],
      links: { next: null },
      meta: { count: 2 },
    };
    const synapseUsers = {
      users: [
        { name: "@alice:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Alice" },
        { name: "@bob:hs", is_guest: 0, admin: 0, deactivated: 0, locked: 0, displayname: "Bob" },
      ],
      total: 2,
    };
    const aliceProfile = {
      name: "@alice:hs",
      admin: 0,
      deactivated: 0,
      locked: 0,
      displayname: "Alice",
      avatar_url: null,
      is_guest: 0,
      shadow_banned: 0,
      erased: 0,
      suspended: 0,
      creation_ts: 1700000000,
    };
    const bobProfile = {
      name: "@bob:hs",
      admin: 0,
      deactivated: 0,
      locked: 0,
      displayname: "Bob",
      avatar_url: null,
      is_guest: 0,
      shadow_banned: 0,
      erased: 0,
      suspended: 0,
      creation_ts: 1700000000,
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(masList)))
      .mockResolvedValueOnce(new Response(JSON.stringify(synapseUsers)))
      .mockResolvedValueOnce(new Response(JSON.stringify(aliceProfile)));

    const result = await freshDataProvider.getList("users", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { admin: true },
    });

    expect(result.data.map(u => u.id)).toEqual(["@alice:hs"]);
    const [, synapseUrl] = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
    expect(synapseUrl).toContain("locked=true");
    expect(synapseUrl).not.toContain("admins=");
    // admin=false must exclude the MAS-only admin and keep the regular user.
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(masList)))
      .mockResolvedValueOnce(new Response(JSON.stringify(synapseUsers)))
      .mockResolvedValueOnce(new Response(JSON.stringify(bobProfile)));
    const nonAdmins = await freshDataProvider.getList("users", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { admin: false },
    });
    expect(nonAdmins.data.map(u => u.id)).toEqual(["@bob:hs"]);
  });

  it("keeps fetching backend pages until a filtered users page is filled", async () => {
    LoadConfig({
      restrictBaseUrl: "",
      corsCredentials: "same-origin",
      asManagedUsers: ["^@sys"],
      menu: [],
      etkeccAdmin: "",
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          users: [
            { name: "@sys1:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 1" },
            { name: "@sys2:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 2" },
            { name: "@user1:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 1" },
            { name: "@sys3:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 3" },
            { name: "@user2:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 2" },
          ],
          total: 5,
        })
      )
    );

    const users = await dataProvider.getList("users", {
      pagination: { page: 1, perPage: 2 },
      sort: { field: "name", order: "ASC" },
      filter: { system_users: false, deactivated: false },
    });

    expect(users.data.map(user => user.id)).toEqual(["@user1:provider", "@user2:provider"]);
    expect(users.total).toEqual(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("from=0");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("limit=250");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("deactivated=false");
  });

  it("paginates users by the filtered system_users dataset", async () => {
    LoadConfig({
      restrictBaseUrl: "",
      corsCredentials: "same-origin",
      asManagedUsers: ["^@sys"],
      menu: [],
      etkeccAdmin: "",
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          users: [
            { name: "@sys1:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 1" },
            { name: "@user1:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 1" },
            { name: "@sys2:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 2" },
            { name: "@user2:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 2" },
            { name: "@user3:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 3" },
            { name: "@sys3:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 3" },
          ],
          total: 6,
        })
      )
    );

    const users = await dataProvider.getList("users", {
      pagination: { page: 2, perPage: 2 },
      sort: { field: "name", order: "ASC" },
      filter: { system_users: false, guests: false },
    });

    expect(users.data.map(user => user.id)).toEqual(["@user3:provider"]);
    expect(users.total).toEqual(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("from=0");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("limit=250");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("guests=false");
  });

  it("stops once the filtered page is filled and reports partial pagination info", async () => {
    LoadConfig({
      restrictBaseUrl: "",
      corsCredentials: "same-origin",
      asManagedUsers: ["^@sys"],
      menu: [],
      etkeccAdmin: "",
    });

    const firstChunkUsers = [
      { name: "@sys1:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 1" },
      { name: "@user1:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 1" },
      { name: "@sys2:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "System 2" },
      { name: "@user2:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 2" },
      { name: "@user3:provider", is_guest: 0, admin: 0, deactivated: 0, displayname: "User 3" },
      ...Array.from({ length: 245 }, (_, index) => ({
        name: `@sys_more${index}:provider`,
        is_guest: 0,
        admin: 0,
        deactivated: 0,
        displayname: `System More ${index}`,
      })),
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          users: firstChunkUsers,
          total: 300,
        })
      )
    );

    const users = await dataProvider.getList("users", {
      pagination: { page: 1, perPage: 2 },
      sort: { field: "name", order: "ASC" },
      filter: { system_users: false },
    });

    expect(users.data.map(user => user.id)).toEqual(["@user1:provider", "@user2:provider"]);
    expect(users.total).toBeUndefined();
    expect(users.pageInfo).toEqual({
      hasPreviousPage: false,
      hasNextPage: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reuses cached filtered scan state across later pages", async () => {
    LoadConfig({
      restrictBaseUrl: "",
      corsCredentials: "same-origin",
      asManagedUsers: ["^@sys"],
      menu: [],
      etkeccAdmin: "",
    });

    const firstChunkUsers = Array.from({ length: 250 }, (_, index) => ({
      name: index < 80 ? `@user${index}:provider` : `@sys${index}:provider`,
      is_guest: 0,
      admin: 0,
      deactivated: 0,
      displayname: `User ${index}`,
    }));
    const secondChunkUsers = Array.from({ length: 50 }, (_, index) => ({
      name: `@user_more${index}:provider`,
      is_guest: 0,
      admin: 0,
      deactivated: 0,
      displayname: `More User ${index}`,
    }));

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: firstChunkUsers,
            total: 300,
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: secondChunkUsers,
            total: 300,
          })
        )
      );

    const page1 = await dataProvider.getList("users", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { system_users: false },
    });

    const page2 = await dataProvider.getList("users", {
      pagination: { page: 2, perPage: 50 },
      sort: { field: "name", order: "ASC" },
      filter: { system_users: false },
    });

    expect(page1.data).toHaveLength(50);
    expect(page2.data).toHaveLength(50);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("from=0");
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toContain("from=250");
  });

  it("update skips the profile PUT when the user was erased (meta.userErased)", async () => {
    const result = await dataProvider.update("users", {
      id: "@bob:hs",
      previousData: { id: "@bob:hs", deactivated: false, erased: false },
      data: { id: "@bob:hs", deactivated: false, erased: false, displayname: "x" },
      meta: { userErased: true },
    });

    // No HTTP request fired; the erased account would have returned M_UNKNOWN.
    expect(fetch).not.toHaveBeenCalled();
    expect(result.data.id).toBe("@bob:hs");
    expect(result.data.deactivated).toBe(true);
    expect(result.data.erased).toBe(true);
  });

  describe("MAS mode, Synapse-only (appservice) user avatar update", () => {
    const initMASDataProvider = async () => {
      // Static import can't be re-evaluated after resetModules; a fresh import re-reads the MAS flag.
      vi.resetModules();
      const { default: freshDataProvider } = await import("./index");
      localStorage.setItem("token_endpoint", "http://mas.example/oauth2/token");
      localStorage.setItem("RaStore.isMAS", "true");
      localStorage.setItem("home_server", "hs");
      const { initResources } = await import("./index");
      initResources();
      return freshDataProvider;
    };

    // Captures Synapse v2 PUT bodies; the MAS lookup returns no user, so the Synapse-only branch runs.
    const mockAvatarFetch = (putBodies: string[], profileAvatar: string | null) => {
      vi.mocked(fetch).mockImplementation(async (input: string | URL | Request, opts?: RequestInit) => {
        const u = String(input);
        if (u.includes("/_matrix/media/v3/upload")) {
          return new Response(JSON.stringify({ content_uri: "mxc://hs/new" }));
        }
        if (u.includes("/_synapse/admin/v2/users/") && opts?.method === "PUT") {
          putBodies.push(String(opts.body));
          return new Response(JSON.stringify({}));
        }
        if (u.includes("/api/admin/v1/users?")) {
          return new Response(JSON.stringify({ data: [] }));
        }
        if (u.includes("/_synapse/admin/v2/users/")) {
          return new Response(JSON.stringify({ displayname: "Bot", avatar_url: profileAvatar, creation_ts: 0 }));
        }
        return new Response(JSON.stringify({}));
      });
    };

    it("PUTs the uploaded avatar_url to Synapse v2", async () => {
      const provider = await initMASDataProvider();
      const putBodies: string[] = [];
      mockAvatarFetch(putBodies, "mxc://hs/new");

      const file = new File(["x"], "backrest.png", { type: "image/png" });
      await provider.update("users", {
        id: "@_webhooks_backrest:hs",
        previousData: { id: "@_webhooks_backrest:hs", mas_id: undefined, avatar_src: "mxc://hs/old" },
        data: { id: "@_webhooks_backrest:hs", avatar_file: { rawFile: file, src: "blob:x", title: "backrest.png" } },
      });

      expect(putBodies).toHaveLength(1);
      expect(JSON.parse(putBodies[0])).toEqual({ avatar_url: "mxc://hs/new" });
    });

    it("PUTs an empty avatar_url to erase the avatar", async () => {
      const provider = await initMASDataProvider();
      const putBodies: string[] = [];
      mockAvatarFetch(putBodies, null);

      await provider.update("users", {
        id: "@_webhooks_backrest:hs",
        previousData: { id: "@_webhooks_backrest:hs", mas_id: undefined, avatar_src: "mxc://hs/old" },
        data: { id: "@_webhooks_backrest:hs", avatar_erase: true },
      });

      expect(putBodies).toHaveLength(1);
      expect(JSON.parse(putBodies[0])).toEqual({ avatar_url: "" });
    });
  });

  it("createMany sends one notice per recipient with no cross-contamination", async () => {
    // Guards the wrong-recipient hazard, and uses mockImplementation since a Response body reads only once.
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ event_id: "$evt" }))));

    const ids = ["@alice:localhost", "@bob:localhost", "@carol:localhost"];
    await dataProvider.createMany("servernotices", { ids, data: { body: "maintenance tonight" } });

    expect(fetch).toHaveBeenCalledTimes(ids.length);

    const sentUserIds = vi.mocked(fetch).mock.calls.map(call => {
      const opts = call[1] as { body: string };
      const body = JSON.parse(opts.body);
      // Every recipient gets the same message body, addressed to themselves only.
      expect(body.content).toEqual({ msgtype: "m.text", body: "maintenance tonight" });
      return body.user_id as string;
    });

    expect([...sentUserIds].sort()).toEqual([...ids].sort());
    expect(new Set(sentUserIds).size).toBe(ids.length);
  });

  it("threads both user_reports filters into the list query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user_reports: [
            {
              id: 1,
              received_ts: 1560432668000,
              user_id: "@reporter:provider",
              target_user_id: "@bad:provider",
              reason: "spam",
            },
          ],
          total: 1,
        })
      )
    );

    const reports = await dataProvider.getList("user_reports", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "received_ts", order: "DESC" },
      filter: { user_id: "reporter", target_user_id: "spammer" },
    });

    expect(reports.data[0].id).toEqual(1);
    expect(reports.total).toEqual(1);
    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).toContain("/_synapse/admin/v1/user_reports");
    expect(url).toContain("user_id=reporter");
    expect(url).toContain("target_user_id=spammer");
  });

  it("does not leak target_user_id into sibling resource queries", async () => {
    // Regression guard: an undefined target_user_id must be dropped before the URL, never sent as a stray param.
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ event_reports: [], total: 0 })));

    await dataProvider.getList("reports", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "received_ts", order: "DESC" },
      filter: {},
    });

    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).not.toContain("target_user_id");
  });
});

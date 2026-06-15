import type { MASRegistrationToken, MASRegistrationTokenResource } from "../types";

vi.mock("react-admin", () => ({
  HttpError: class HttpError extends Error {
    constructor(
      message: string,
      public status: number,
      public body?: Record<string, unknown>
    ) {
      super(message);
    }
  },
  useStore: vi.fn(() => [false, vi.fn()]),
}));

vi.mock("../http", () => ({
  jsonClient: vi.fn(),
}));

import {
  buildMASCursorKey,
  convertMASTokenToSynapse,
  filterUndefined,
  getMASBaseUrl,
  getMASCursor,
  getMASNextPageCursor,
  getMASTokenResource,
  isMAS,
  setIsMAS,
  setMASCursor,
  toRfc3339,
} from "./mas-utils";

beforeEach(() => {
  localStorage.clear();
});

// --- isMAS / setIsMAS ---

describe("isMAS / setIsMAS", () => {
  it("returns false when localStorage has no entry", () => {
    expect(isMAS()).toBe(false);
  });

  it("returns true after setIsMAS(true)", () => {
    setIsMAS(true);
    expect(isMAS()).toBe(true);
  });

  it("returns false after setIsMAS(false)", () => {
    setIsMAS(true);
    setIsMAS(false);
    expect(isMAS()).toBe(false);
  });
});

// --- getMASBaseUrl ---

describe("getMASBaseUrl", () => {
  it("returns null when token_endpoint is absent", () => {
    expect(getMASBaseUrl()).toBeNull();
  });

  it("strips /oauth2/token to return the base URL", () => {
    localStorage.setItem("token_endpoint", "http://localhost:8007/oauth2/token");
    expect(getMASBaseUrl()).toBe("http://localhost:8007");
  });

  it("returns the full value when it does not end with /oauth2/token", () => {
    localStorage.setItem("token_endpoint", "http://localhost:8007/custom");
    expect(getMASBaseUrl()).toBe("http://localhost:8007/custom");
  });
});

// --- toRfc3339 ---

describe("toRfc3339", () => {
  it("returns undefined for undefined", () => {
    expect(toRfc3339(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(toRfc3339(null)).toBeUndefined();
  });

  it("returns undefined for 0", () => {
    expect(toRfc3339(0)).toBeUndefined();
  });

  it("converts a millisecond timestamp to an ISO string", () => {
    const ts = new Date("2024-03-15T10:00:00.000Z").getTime();
    expect(toRfc3339(ts)).toBe("2024-03-15T10:00:00.000Z");
  });
});

// --- filterUndefined ---

describe("filterUndefined", () => {
  it("removes undefined values", () => {
    expect(filterUndefined({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("removes null values", () => {
    expect(filterUndefined({ a: 1, b: null })).toEqual({ a: 1 });
  });

  it("keeps zero and false", () => {
    expect(filterUndefined({ a: 0, b: false, c: "" })).toEqual({ a: 0, b: false, c: "" });
  });

  it("returns empty object when all values are null/undefined", () => {
    expect(filterUndefined({ a: null, b: undefined })).toEqual({});
  });
});

// --- getMASTokenResource ---

const makeTokenResource = (): MASRegistrationTokenResource => ({
  type: "registration-token",
  id: "token-1",
  attributes: {
    token: "tok123",
    valid: true,
    times_used: 5,
    created_at: "2024-01-01T00:00:00Z",
  },
  links: { self: "/tokens/token-1" },
});

describe("getMASTokenResource", () => {
  it("unwraps a wrapped MASRegistrationToken (has 'data' key)", () => {
    const wrapped: MASRegistrationToken = {
      data: makeTokenResource(),
      links: { self: "/tokens/token-1" },
    };
    expect(getMASTokenResource(wrapped)).toBe(wrapped.data);
  });

  it("returns a bare MASRegistrationTokenResource unchanged", () => {
    const resource = makeTokenResource();
    expect(getMASTokenResource(resource)).toBe(resource);
  });
});

// --- convertMASTokenToSynapse ---

describe("convertMASTokenToSynapse", () => {
  it("maps all fields correctly from a resource", () => {
    const resource = makeTokenResource();
    resource.attributes.usage_limit = 10;
    resource.attributes.expires_at = "2025-01-01T00:00:00Z";
    resource.attributes.last_used_at = "2024-06-01T00:00:00Z";
    resource.attributes.revoked_at = undefined;

    const result = convertMASTokenToSynapse(resource);

    expect(result.token).toBe("tok123");
    expect(result.valid).toBe(true);
    expect(result.uses_allowed).toBe(10);
    expect(result.pending).toBe(0);
    expect(result.completed).toBe(5);
    expect(result.expiry_time).toBe("2025-01-01T00:00:00Z");
    expect(result.created_at).toBe("2024-01-01T00:00:00Z");
    expect(result.last_used_at).toBe("2024-06-01T00:00:00Z");
    expect(result.revoked_at).toBeUndefined();
  });

  it("falls back to null uses_allowed when usage_limit is absent", () => {
    const resource = makeTokenResource();
    const result = convertMASTokenToSynapse(resource);
    expect(result.uses_allowed).toBeNull();
  });

  it("falls back to null expiry_time when expires_at is absent", () => {
    const resource = makeTokenResource();
    const result = convertMASTokenToSynapse(resource);
    expect(result.expiry_time).toBeNull();
  });

  it("defaults valid to true when undefined", () => {
    const resource = makeTokenResource();
    // @ts-expect-error testing undefined case
    resource.attributes.valid = undefined;
    expect(convertMASTokenToSynapse(resource).valid).toBe(true);
  });

  it("accepts a wrapped MASRegistrationToken", () => {
    const wrapped: MASRegistrationToken = {
      data: makeTokenResource(),
      links: { self: "/" },
    };
    const result = convertMASTokenToSynapse(wrapped);
    expect(result.token).toBe("tok123");
  });
});

// --- buildMASCursorKey / getMASCursor / setMASCursor ---

describe("cursor cache", () => {
  it("buildMASCursorKey returns a stable JSON string", () => {
    const key = buildMASCursorKey("users", 20, { valid: true });
    expect(key).toBe(JSON.stringify({ resource: "users", perPage: 20, filter: { valid: true } }));
  });

  it("getMASCursor returns undefined for an unknown cache key", () => {
    expect(getMASCursor("no-such-key", 1)).toBeUndefined();
  });

  it("setMASCursor + getMASCursor round-trips correctly", () => {
    const key = buildMASCursorKey("tokens", 10, {});
    setMASCursor(key, 2, "cursor-abc");
    expect(getMASCursor(key, 2)).toBe("cursor-abc");
  });

  it("stores independent cursors for different pages", () => {
    const key = buildMASCursorKey("tokens", 10, {});
    setMASCursor(key, 1, "cursor-page1");
    setMASCursor(key, 2, "cursor-page2");
    expect(getMASCursor(key, 1)).toBe("cursor-page1");
    expect(getMASCursor(key, 2)).toBe("cursor-page2");
  });
});

// --- getMASNextPageCursor ---

describe("getMASNextPageCursor", () => {
  it("returns undefined for empty data array", () => {
    expect(getMASNextPageCursor({ data: [] })).toBeUndefined();
  });

  it("returns undefined when data is absent", () => {
    expect(getMASNextPageCursor({})).toBeUndefined();
  });

  it("extracts cursor from links.next URL", () => {
    const result = getMASNextPageCursor({
      links: { next: "https://example.invalid/api?page[after]=cursor-xyz" },
      data: [],
    });
    expect(result).toBe("cursor-xyz");
  });

  it("falls back to last item meta.page.cursor when no links.next", () => {
    const result = getMASNextPageCursor({
      data: [
        { id: "1", meta: { page: { cursor: "cursor-a" } } },
        { id: "2", meta: { page: { cursor: "cursor-b" } } },
      ],
    });
    expect(result).toBe("cursor-b");
  });

  it("falls back to last item id when meta cursor is absent", () => {
    const result = getMASNextPageCursor({
      data: [{ id: "item-1" }, { id: "item-2" }],
    });
    expect(result).toBe("item-2");
  });

  it("ignores malformed links.next and falls back to item cursor", () => {
    const result = getMASNextPageCursor({
      links: { next: "not a valid url" },
      data: [{ id: "item-1", meta: { page: { cursor: "cursor-x" } } }],
    });
    // URL is malformed but "not a valid url" doesn't have page[after] param; falls through to item cursor
    expect(result).toBe("cursor-x");
  });
});

import { Mock } from "vitest";
import { fetchUtils } from "react-admin";

import {
  isValidBaseUrl,
  splitMxid,
  resolveBaseUrlWithWellKnown,
  getWellKnownUrl,
  getAuthMetadata,
  uploadMedia,
} from "./matrix";
import { jsonClient } from "./http";

vi.mock("react-admin", () => ({
  fetchUtils: {
    fetchJson: vi.fn(),
  },
}));

vi.mock("./http", () => ({
  jsonClient: vi.fn(),
}));

describe("splitMxid", () => {
  test.each([
    // valid: hostname
    ["@name:domain.tld", { name: "name", domain: "domain.tld" }],
    ["@name:domain.tld:8448", { name: "name", domain: "domain.tld:8448" }],
    // valid: single-label / localhost
    ["@name:localhost", { name: "name", domain: "localhost" }],
    ["@name:localhost:8448", { name: "name", domain: "localhost:8448" }],
    // valid: IPv4
    ["@name:192.168.1.1", { name: "name", domain: "192.168.1.1" }],
    ["@name:192.168.1.1:8448", { name: "name", domain: "192.168.1.1:8448" }],
    // valid: IPv6
    ["@name:[::1]", { name: "name", domain: "[::1]" }],
    ["@name:[::1]:8448", { name: "name", domain: "[::1]:8448" }],
    ["@name:[2001:db8::1]", { name: "name", domain: "[2001:db8::1]" }],
    ["@name:[2001:db8::1]:8448", { name: "name", domain: "[2001:db8::1]:8448" }],
    // invalid
    ["foo", undefined],
    ["@noserver", undefined],
    ["notanmxid:domain.tld", undefined],
  ])("splitMxid(%s)", (mxid, expected) => {
    expect(splitMxid(mxid)).toEqual(expected);
  });
});

describe("isValidBaseUrl", () => {
  test.each([
    // valid: hostname
    ["http://foo.bar", true],
    ["https://foo.bar", true],
    ["https://foo.bar:1234", true],
    ["https://foo.bar/", true],
    ["https://foo.bar:1234/", true],
    // valid: IPv4
    ["http://192.168.1.1", true],
    ["https://192.168.1.1:8448", true],
    // valid: IPv6
    ["http://[::1]", true],
    ["https://[::1]", true],
    ["http://[::1]:8448", true],
    ["https://[::1]:8448/", true],
    ["https://[2001:db8::1]", true],
    ["https://[2001:db8::1]:443", true],
    ["https://[2001:db8::1]:443/", true],
    ["http://[2001:db8:cafe::1]:7000", true],
    // invalid: missing / wrong protocol
    [undefined, false],
    [null, false],
    ["", false],
    [{}, false],
    ["foo.bar", false],
    ["ftp://foo.bar", false],
    ["http:/foo.bar", false],
    // invalid: has path
    ["http://foo.bar/path", false],
    ["https://[::1]/path", false],
    // invalid: bare IPv6 without brackets
    ["http://::1", false],
  ])("isValidBaseUrl(%s) === %s", (url, expected) => {
    expect(isValidBaseUrl(url)).toBe(expected);
  });
});

describe("resolveBaseUrlWithWellKnown", () => {
  const fetchJsonMock = fetchUtils.fetchJson as Mock;

  afterEach(() => {
    fetchJsonMock.mockReset();
  });

  it("returns well-known base_url when present", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://api.example.com");
    expect(fetchJsonMock).toHaveBeenCalledWith("https://example.com/.well-known/matrix/client", { method: "GET" });
  });

  it("falls back to provided URL when well-known fails", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("nope"));

    await expect(resolveBaseUrlWithWellKnown("https://example.com/")).resolves.toBe("https://example.com");
  });

  it("keeps the provided URL when the homeserver opts out via cc.etke.ketesa", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.ketesa": { wellKnownDiscovery: false },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://example.com");
  });

  it("keeps the provided URL when opted out via the legacy cc.etke.synapse-admin key", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.synapse-admin": { wellKnownDiscovery: false },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://example.com");
  });

  it("still canonizes when wellKnownDiscovery is not false", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.ketesa": { wellKnownDiscovery: true },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://api.example.com");
  });

  it("opts out only on a strict boolean false, not a truthy string", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.ketesa": { wellKnownDiscovery: "false" },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://api.example.com");
  });

  it("prefers cc.etke.ketesa over the legacy key when both are present", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.ketesa": { wellKnownDiscovery: false },
        "cc.etke.synapse-admin": { wellKnownDiscovery: true },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://example.com");
  });

  it("preserves an http:// URL with port when the homeserver opts out (VPN / local IP)", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://matrix.example.com" },
        "cc.etke.ketesa": { wellKnownDiscovery: false },
      },
    });

    await expect(resolveBaseUrlWithWellKnown("http://10.0.0.5:8008")).resolves.toBe("http://10.0.0.5:8008");
  });

  it("falls back to the provided URL when the well-known has no m.homeserver", async () => {
    fetchJsonMock.mockResolvedValueOnce({ json: {} });

    await expect(resolveBaseUrlWithWellKnown("https://example.com")).resolves.toBe("https://example.com");
  });
});

describe("getWellKnownUrl", () => {
  const fetchJsonMock = fetchUtils.fetchJson as Mock;

  afterEach(() => {
    fetchJsonMock.mockReset();
  });

  it("returns the well-known base_url by default", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: { "m.homeserver": { base_url: "https://api.example.com" } },
    });

    await expect(getWellKnownUrl("example.com")).resolves.toBe("https://api.example.com");
  });

  it("returns https://<domain> when the homeserver opts out via cc.etke.ketesa", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.ketesa": { wellKnownDiscovery: false },
      },
    });

    await expect(getWellKnownUrl("example.com")).resolves.toBe("https://example.com");
  });

  it("honors the legacy cc.etke.synapse-admin opt-out key", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      json: {
        "m.homeserver": { base_url: "https://api.example.com" },
        "cc.etke.synapse-admin": { wellKnownDiscovery: false },
      },
    });

    await expect(getWellKnownUrl("example.com")).resolves.toBe("https://example.com");
  });

  it("falls back to https://<domain> when well-known is absent", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("404"));

    await expect(getWellKnownUrl("example.com")).resolves.toBe("https://example.com");
  });

  it("falls back to https://<domain> when the well-known has no m.homeserver", async () => {
    fetchJsonMock.mockResolvedValueOnce({ json: {} });

    await expect(getWellKnownUrl("example.com")).resolves.toBe("https://example.com");
  });
});

describe("getAuthMetadata", () => {
  const fetchJsonMock = fetchUtils.fetchJson as Mock;
  const baseUrl = "https://matrix.example.com";
  const v1Url = `${baseUrl}/_matrix/client/v1/auth_metadata`;
  const unstableUrl = `${baseUrl}/_matrix/client/unstable/org.matrix.msc2965/auth_metadata`;
  const metadata = {
    issuer: "https://auth.example.com/",
    authorization_endpoint: "https://auth.example.com/oauth2/auth",
    token_endpoint: "https://auth.example.com/oauth2/token",
    registration_endpoint: "https://auth.example.com/oauth2/clients/register",
    revocation_endpoint: "https://auth.example.com/oauth2/revoke",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_modes_supported: ["query", "fragment"],
    code_challenge_methods_supported: ["S256"],
  };

  afterEach(() => {
    fetchJsonMock.mockReset();
  });

  it("returns metadata from v1 endpoint when it succeeds (stable endpoint tried first)", async () => {
    fetchJsonMock.mockResolvedValueOnce({ status: 200, json: metadata });

    const result = await getAuthMetadata(baseUrl);

    expect(result).toEqual(metadata);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchJsonMock).toHaveBeenCalledWith(v1Url, { method: "GET" });
  });

  it("falls back to unstable endpoint when v1 returns 404", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("404"));
    fetchJsonMock.mockResolvedValueOnce({ status: 200, json: metadata });

    const result = await getAuthMetadata(baseUrl);

    expect(result).toEqual(metadata);
    expect(fetchJsonMock).toHaveBeenCalledTimes(2);
    expect(fetchJsonMock).toHaveBeenNthCalledWith(1, v1Url, { method: "GET" });
    expect(fetchJsonMock).toHaveBeenNthCalledWith(2, unstableUrl, { method: "GET" });
  });

  it("returns null when both endpoints fail with network errors", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("network error"));
    fetchJsonMock.mockRejectedValueOnce(new Error("network error"));

    await expect(getAuthMetadata(baseUrl)).resolves.toBeNull();
  });

  it("returns null when both endpoints return 404 (react-admin fetchJson throws on non-2xx)", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("404 Not Found"));
    fetchJsonMock.mockRejectedValueOnce(new Error("404 Not Found"));

    await expect(getAuthMetadata(baseUrl)).resolves.toBeNull();
  });

  it("returns null when v1 returns 200 but response is missing issuer field", async () => {
    fetchJsonMock.mockResolvedValueOnce({
      status: 200,
      json: { authorization_endpoint: "https://auth.example.com/oauth2/auth" },
    });
    fetchJsonMock.mockResolvedValueOnce({
      status: 200,
      json: { authorization_endpoint: "https://auth.example.com/oauth2/auth" },
    });

    await expect(getAuthMetadata(baseUrl)).resolves.toBeNull();
  });
});

describe("uploadMedia", () => {
  const jsonClientMock = jsonClient as Mock;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("base_url", "https://hs.example");
    jsonClientMock.mockResolvedValue({ json: { content_uri: "mxc://hs.example/abc123" } });
  });

  afterEach(() => {
    jsonClientMock.mockReset();
  });

  it("encodes spaces in filename", async () => {
    await uploadMedia({ file: new File(["data"], "test"), filename: "my file.png", content_type: "image/png" });
    expect(jsonClientMock).toHaveBeenCalledWith(expect.stringContaining("filename=my%20file.png"), expect.any(Object));
  });

  it("encodes non-ASCII characters in filename", async () => {
    await uploadMedia({ file: new File(["data"], "test"), filename: "résumé.pdf", content_type: "application/pdf" });
    expect(jsonClientMock).toHaveBeenCalledWith(
      expect.stringContaining("filename=r%C3%A9sum%C3%A9.pdf"),
      expect.any(Object)
    );
  });

  it("leaves plain filenames unmodified", async () => {
    await uploadMedia({ file: new File(["data"], "test"), filename: "plain.jpg", content_type: "image/jpeg" });
    expect(jsonClientMock).toHaveBeenCalledWith(expect.stringContaining("filename=plain.jpg"), expect.any(Object));
  });

  it("uses base_url from localStorage for the upload URL", async () => {
    await uploadMedia({ file: new File(["data"], "test"), filename: "file.txt", content_type: "text/plain" });
    expect(jsonClientMock).toHaveBeenCalledWith(
      expect.stringContaining("https://hs.example/_matrix/media/v3/upload"),
      expect.any(Object)
    );
  });

  it("returns the content_uri from the server response", async () => {
    const result = await uploadMedia({
      file: new File(["data"], "test"),
      filename: "file.txt",
      content_type: "text/plain",
    });
    expect(result).toEqual({ content_uri: "mxc://hs.example/abc123" });
  });
});

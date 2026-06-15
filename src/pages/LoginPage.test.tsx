import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { AdminContext } from "react-admin";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import LoginPage from "./LoginPage";
import { getDefaultProtocolForHomeserverInput, isValidIssuer } from "../components/login/urls";
import { AppContext } from "../Context";
import englishMessages from "../i18n/en";
import { getServerVersion } from "../providers/data/synapse";
import { getAuthMetadata, getSupportedFeatures, getSupportedLoginFlows } from "../providers/matrix";

// Mock only the network-touching probe functions; keep the rest of each module
// (isValidBaseUrl, splitMxid, etc.) intact for the components that use them.
vi.mock("../providers/matrix", async importOriginal => {
  const actual = await importOriginal<typeof import("../providers/matrix")>();
  return {
    ...actual,
    resolveBaseUrlWithWellKnown: vi.fn(async (url: string) => url),
    getSupportedFeatures: vi.fn(),
    getSupportedLoginFlows: vi.fn(),
    getAuthMetadata: vi.fn(),
  };
});

vi.mock("../providers/data/synapse", async importOriginal => {
  const actual = await importOriginal<typeof import("../providers/data/synapse")>();
  return {
    ...actual,
    getServerVersion: vi.fn(),
  };
});

const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);
const welcomeText = englishMessages.ketesa.auth.welcome.replace("%{name}", "Ketesa");
const auth = englishMessages.ketesa.auth;
const signIn = englishMessages.ra.auth.sign_in;

const mockFeatures = getSupportedFeatures as Mock;
const mockFlows = getSupportedLoginFlows as Mock;
const mockAuthMetadata = getAuthMetadata as Mock;
const mockServerVersion = getServerVersion as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: a reachable password-only server.
  mockFeatures.mockResolvedValue({ versions: ["v1.11"] });
  mockFlows.mockResolvedValue([{ type: "m.login.password" }]);
  mockAuthMetadata.mockResolvedValue(null);
  mockServerVersion.mockResolvedValue("1.100.0");
});

const renderSingleRestrict = (url = "https://matrix.example.com") =>
  render(
    <AppContext.Provider
      value={{
        restrictBaseUrl: url,
        asManagedUsers: [],
        menu: [],
        corsCredentials: "include",
        externalAuthProvider: false,
      }}
    >
      <AdminContext i18nProvider={i18nProvider}>
        <LoginPage />
      </AdminContext>
    </AppContext.Provider>
  );

const renderUnrestricted = () =>
  render(
    <AdminContext i18nProvider={i18nProvider}>
      <LoginPage />
    </AdminContext>
  );

describe("isValidIssuer", () => {
  it.each([
    // valid: https any host
    ["https://auth.example.com/", true],
    ["https://auth.example.com", true],
    ["https://localhost:8007/", true],
    ["https://127.0.0.1:8007", true],
    // valid: http for intranet/local deployments
    ["http://localhost:8007", true],
    ["http://127.0.0.1:8007", true],
    ["http://mas.intranet.corp", true],
    ["http://auth.internal/", true],
    // invalid: query string or fragment
    ["https://auth.example.com/?foo=bar", false],
    ["https://auth.example.com/#section", false],
    // invalid: non-http scheme
    ["ftp://auth.example.com/", false],
    ["javascript:alert(1)", false],
    // invalid: not a URL
    ["not-a-url", false],
    ["", false],
  ])("isValidIssuer(%s) === %s", (issuer, expected) => {
    expect(isValidIssuer(issuer)).toBe(expected);
  });
});

describe("getDefaultProtocolForHomeserverInput", () => {
  it.each([
    ["localhost", "http"],
    ["localhost:8008", "http"],
    ["127.0.0.1", "http"],
    ["127.0.0.1:8008", "http"],
    ["::1", "http"],
    ["[::1]:8008", "http"],
    ["matrix.example.com", "https"],
    ["matrix.example.com:8448", "https"],
  ])("selects %s for %s homeserver inputs", (input, expectedProtocol) => {
    expect(getDefaultProtocolForHomeserverInput(input)).toBe(expectedProtocol);
  });
});

describe("LoginPage rendering", () => {
  it("renders with no restriction to homeserver", () => {
    renderUnrestricted();

    screen.getByText(welcomeText);
    screen.getByRole("combobox", { name: "" }); // Language selector
    const baseUrlInput = screen.getByRole("textbox", { name: auth.base_url });
    expect(baseUrlInput.className.split(" ")).not.toContain("Mui-readOnly");
  });

  it("renders the username/password fields immediately, before any probe (keyboard-trap fix)", () => {
    // The inputs must be in the DOM regardless of probe state; that is the
    // WCAG 2.1.2 keyboard-trap fix. They are no longer gated on an async result.
    renderUnrestricted();

    expect(screen.getByLabelText(/username/i)).toBeEnabled();
    expect(screen.getByLabelText(/password/i, { selector: "input" })).toBeEnabled();
  });

  it("Tab from the homeserver URL reaches the username field (no focus trap)", async () => {
    const user = userEvent.setup();
    renderUnrestricted();

    const baseUrl = screen.getByRole("textbox", { name: auth.base_url });
    baseUrl.focus();
    expect(baseUrl).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/username/i)).toHaveFocus();
  });

  it("renders with single restricted homeserver", async () => {
    renderSingleRestrict();

    screen.getByText(welcomeText);
    // Base URL field is hidden for a single fixed homeserver.
    expect(() => screen.getByRole("textbox", { name: auth.base_url })).toThrow();
  });

  it("renders the base URL combobox for multiple restricted homeservers", () => {
    render(
      <AppContext.Provider
        value={{
          restrictBaseUrl: ["https://matrix.example.com", "https://matrix.example.org"],
          asManagedUsers: [],
          menu: [],
          corsCredentials: "include",
          externalAuthProvider: false,
        }}
      >
        <AdminContext i18nProvider={i18nProvider}>
          <LoginPage />
        </AdminContext>
      </AppContext.Provider>
    );

    screen.getByText(welcomeText);
    screen.getByRole("combobox", { name: auth.base_url });
  });
});

describe("LoginPage server probe: capability matrix", () => {
  it("password-only server: password Sign-in shown, no SSO/OIDC", async () => {
    mockFlows.mockResolvedValue([{ type: "m.login.password" }]);
    renderSingleRestrict();

    await waitFor(() => expect(screen.getByRole("button", { name: signIn })).toBeEnabled());
    expect(screen.queryByRole("button", { name: auth.sso_sign_in })).toBeNull();
    expect(screen.queryByRole("button", { name: auth.oidc_sign_in })).toBeNull();
  });

  it("password + SSO server: both password Sign-in and SSO button shown", async () => {
    mockFlows.mockResolvedValue([{ type: "m.login.password" }, { type: "m.login.sso" }]);
    renderSingleRestrict();

    expect(await screen.findByRole("button", { name: auth.sso_sign_in })).toBeEnabled();
    expect(screen.getByRole("button", { name: signIn })).toBeEnabled();
  });

  it("SSO with oauth_aware_preferred + valid issuer (suppress password): OIDC button + notice, no password Sign-in", async () => {
    mockFlows.mockResolvedValue([{ type: "m.login.sso", oauth_aware_preferred: true }]);
    mockAuthMetadata.mockResolvedValue({
      issuer: "https://mas.example.com",
      authorization_endpoint: "https://mas.example.com/authorize",
      token_endpoint: "https://mas.example.com/token",
    });
    renderSingleRestrict();

    expect(await screen.findByRole("button", { name: auth.oidc_sign_in })).toBeEnabled();
    expect(screen.getByText(auth.server_state.suppress_password_notice)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: signIn })).toBeNull();
  });

  it("suppress_password without a usable issuer: notice shown, but NO OIDC button (no broken flow)", async () => {
    // A server can advertise oauth_aware_preferred without a valid auth_metadata
    // issuer (misconfigured or malicious). The OIDC button must NOT render; it
    // would fire handleOIDC with a null issuer. Only caps.oidc (valid issuer) shows it.
    mockFlows.mockResolvedValue([{ type: "m.login.sso", oauth_aware_preferred: true }]);
    mockAuthMetadata.mockResolvedValue(null);
    renderSingleRestrict();

    expect(await screen.findByText(auth.server_state.suppress_password_notice)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: auth.oidc_sign_in })).toBeNull();
  });

  it("OIDC-only server (no flows, auth_metadata issuer present): OIDC button, no password Sign-in", async () => {
    mockFlows.mockResolvedValue([]);
    mockAuthMetadata.mockResolvedValue({
      issuer: "https://mas.example.com",
      authorization_endpoint: "https://mas.example.com/authorize",
      token_endpoint: "https://mas.example.com/token",
    });
    renderSingleRestrict();

    expect(await screen.findByRole("button", { name: auth.oidc_sign_in })).toBeEnabled();
    expect(screen.queryByRole("button", { name: signIn })).toBeNull();
  });

  it("incompatible server (reachable, no usable auth): shows the incompatible notice naming flows", async () => {
    mockFlows.mockResolvedValue([{ type: "m.login.token" }]);
    mockAuthMetadata.mockResolvedValue(null);
    renderSingleRestrict();

    const notice = await screen.findByText(/doesn't support/i);
    expect(notice).toHaveTextContent("m.login.token");
  });

  it("unreachable server (all probes reject): shows the unreachable notice", async () => {
    mockFeatures.mockRejectedValue(new Error("network"));
    mockFlows.mockRejectedValue(new Error("network"));
    mockAuthMetadata.mockResolvedValue(null);
    mockServerVersion.mockRejectedValue(new Error("network"));
    renderSingleRestrict();

    expect(await screen.findByText(auth.server_state.unreachable)).toBeInTheDocument();
  });
});

describe("LoginPage server probe: resolving state", () => {
  it("keeps inputs enabled and disables Sign-in (with 'Checking server…') while resolving", async () => {
    // Never-resolving probes keep the form in the resolving state.
    mockFeatures.mockReturnValue(new Promise(() => undefined));
    mockFlows.mockReturnValue(new Promise(() => undefined));
    mockAuthMetadata.mockReturnValue(new Promise(() => undefined));
    mockServerVersion.mockReturnValue(new Promise(() => undefined));
    renderSingleRestrict();

    const checking = await screen.findByRole("button", { name: auth.server_state.checking });
    expect(checking).toBeDisabled();
    // Inputs remain enabled during resolving (autofill compatibility + no trap).
    expect(screen.getByLabelText(/username/i)).toBeEnabled();
    expect(screen.getByLabelText(/password/i, { selector: "input" })).toBeEnabled();
  });
});

describe("LoginPage server probe: staleness guard", () => {
  it("a superseded probe never overwrites the fresh one (last URL wins)", async () => {
    const user = userEvent.setup();
    // url1's other three probes (features, authMetadata, serverVersion) resolve immediately via
    // the beforeEach defaults; only url1's flows is held open below. So url1's Promise.allSettled
    // DOES settle when we release resolveStaleFlows; and the signal.aborted guard in start() is
    // the sole reason url1's late result is discarded. Remove that guard and this test fails.
    let resolveStaleFlows: (value: unknown) => void = () => undefined;
    mockFlows
      .mockImplementationOnce(() => new Promise(resolve => (resolveStaleFlows = resolve))) // url1: held open
      .mockResolvedValue([{ type: "m.login.sso" }]); // url2: resolves immediately to SSO-only
    mockAuthMetadata.mockResolvedValueOnce(null).mockResolvedValue({
      issuer: "https://mas.example.com",
      authorization_endpoint: "https://mas.example.com/authorize",
      token_endpoint: "https://mas.example.com/token",
    });
    renderUnrestricted();

    const baseUrl = screen.getByRole("textbox", { name: auth.base_url });
    await user.type(baseUrl, "https://stale.example.com");
    await user.tab(); // start(url1): flows held pending
    await user.clear(baseUrl);
    await user.type(baseUrl, "https://fresh.example.com");
    await user.tab(); // start(url2): aborts url1, resolves to SSO

    // url2 wins: SSO button appears, no password Sign-in.
    expect(await screen.findByRole("button", { name: auth.sso_sign_in })).toBeInTheDocument();

    // Now let url1 resolve late with password; it must be discarded (signal aborted).
    resolveStaleFlows([{ type: "m.login.password" }]);
    await new Promise(resolve => queueMicrotask(() => resolve(null)));

    expect(screen.getByRole("button", { name: auth.sso_sign_in })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: signIn })).toBeNull();
  });
});

import createLogger from "./logger";

const log = createLogger("config");

export interface Config {
  restrictBaseUrl: string | string[];
  corsCredentials: string;
  asManagedUsers: RegExp[] | string[];
  menu: MenuItem[];
  externalAuthProvider?: boolean;
  etkeccAdmin?: string;
  wellKnownDiscovery?: boolean;
}

export interface MenuItem {
  label: string;
  i18n?: Record<string, string>;
  icon: string;
  url: string;
}

export const WellKnownKey = "cc.etke.ketesa";
export const WellKnownKeyLegacy = "cc.etke.synapse-admin";

type ConfigListener = () => void;

const configListeners = new Set<ConfigListener>();

const notifyConfigListeners = () => {
  configListeners.forEach(listener => listener());
};

// current configuration
let config: Config = {
  restrictBaseUrl: "",
  corsCredentials: "same-origin",
  asManagedUsers: [],
  menu: [],
  etkeccAdmin: "",
};

export const FetchConfig = async () => {
  // load config.json and honor vite base url (import.meta.env.BASE_URL)
  // if that url doesn't have a trailing slash - add it
  let configJSONUrl = "config.json";
  if (import.meta.env.BASE_URL) {
    configJSONUrl = `${import.meta.env.BASE_URL.replace(/\/?$/, "/")}config.json`;
  }
  try {
    const resp = await fetch(configJSONUrl);
    const configJSON = await resp.json();
    log.debug("config.json loaded", { url: configJSONUrl });
    LoadConfig(configJSON);
  } catch (e) {
    log.warn("config.json not found, using defaults", e);
  }

  await FetchWellKnownConfig();

  if (config.externalAuthProvider !== undefined) {
    SetExternalAuthProvider(config.externalAuthProvider);
  }
};

export const FetchWellKnownConfig = async () => {
  let protocol = "https";
  const baseURL = localStorage.getItem("base_url");
  if (baseURL && baseURL.startsWith("http://")) {
    protocol = "http";
  }

  // if home_server is set, try to load https://home_server/.well-known/matrix/client
  let homeserver = localStorage.getItem("home_server");
  // if it is not set, attempt to identify homeserver from the restrictBaseUrl config
  if (!homeserver) {
    const restrictBaseUrl = config.restrictBaseUrl;
    if (typeof restrictBaseUrl === "string" && restrictBaseUrl !== "") {
      try {
        const url = new URL(restrictBaseUrl);
        const host = url.host;
        if (host) {
          homeserver = host;
        }
      } catch (e) {
        // invalid URL, ignore
        log.warn("invalid restrictBaseUrl, skipping", { restrictBaseUrl, error: e });
      }
    } else if (Array.isArray(restrictBaseUrl) && restrictBaseUrl.length > 0 && restrictBaseUrl[0] !== "") {
      try {
        const url = new URL(restrictBaseUrl[0]);
        const host = url.host;
        if (host) {
          homeserver = host;
        }
      } catch (e) {
        log.warn("invalid restrictBaseUrl, skipping", { restrictBaseUrl: restrictBaseUrl[0], error: e });
      }
    }
  }

  if (!homeserver) {
    return false;
  }

  try {
    const resp = await fetch(`${protocol}://${homeserver}/.well-known/matrix/client`);
    const configWK = await resp.json();
    const wkConfig = configWK[WellKnownKey] || configWK[WellKnownKeyLegacy];
    if (!wkConfig) {
      log.debug("well-known loaded but no Ketesa config key found", {
        homeserver,
        expectedKey: WellKnownKey,
        legacyKey: WellKnownKeyLegacy,
        response: configWK,
      });
      return false;
    }

    log.info("well-known config loaded", { homeserver });
    // Well-known config overlays config.json values (including restrictBaseUrl)
    // intentionally; well-known is admin-trusted as part of the deployment's
    // homeserver config.
    LoadConfig(wkConfig);
    return true;
  } catch (e) {
    log.debug("well-known not found, skipping", { homeserver, error: e });
    return false;
  }
};

// load config from context
// we deliberately processing each key separately to avoid overwriting the whole config, losing some keys, and messing
// with typescript types
export const LoadConfig = (context: Config) => {
  const nextConfig: Config = { ...config };
  let changed = false;
  if (context?.restrictBaseUrl) {
    nextConfig.restrictBaseUrl = context.restrictBaseUrl as string | string[];
    changed = true;
  }

  if (context?.corsCredentials) {
    nextConfig.corsCredentials = context.corsCredentials;
    changed = true;
  }

  if (context?.asManagedUsers) {
    nextConfig.asManagedUsers = context.asManagedUsers.map((regex: string | RegExp) =>
      typeof regex === "string" ? new RegExp(regex) : regex
    );
    changed = true;
  }

  let menu: MenuItem[] = [];
  if (context?.menu) {
    menu = context.menu as MenuItem[];
  }
  if (menu.length > 0) {
    nextConfig.menu = menu;
    changed = true;
  }

  if (context?.externalAuthProvider !== undefined) {
    nextConfig.externalAuthProvider = context.externalAuthProvider;
    changed = true;
  }
  // if not set in context, try to load from localStorage
  if (nextConfig.externalAuthProvider === undefined) {
    const storedExternalAuthProvider = localStorage.getItem("external_auth_provider");
    if (storedExternalAuthProvider !== null) {
      nextConfig.externalAuthProvider = storedExternalAuthProvider === "true";
      changed = true;
    }
  }

  if (context?.wellKnownDiscovery !== undefined) {
    nextConfig.wellKnownDiscovery = context.wellKnownDiscovery;
    changed = true;
  }

  if (context?.etkeccAdmin) {
    nextConfig.etkeccAdmin = context.etkeccAdmin;
    changed = true;
  }

  if (changed) {
    config = nextConfig;
    log.debug("config updated", { config });
    notifyConfigListeners();
  }
};

// get config
export const GetConfig = (): Config => {
  return config;
};

// Clear session-specific runtime state from config and localStorage.
// Static deployment config (restrictBaseUrl, corsCredentials, asManagedUsers, menu, etkeccAdmin)
// is preserved so the login page behaves correctly after logout.
export const ClearConfig = () => {
  config = { ...config, externalAuthProvider: undefined };
  localStorage.clear();
  notifyConfigListeners();
};

// workaround for external auth providers (like OIDC, LDAP, etc.) to signal that some functionality should be disabled
export const SetExternalAuthProvider = (value: boolean) => {
  config = { ...config, externalAuthProvider: value };
  localStorage.setItem("external_auth_provider", value ? "true" : "false");
  notifyConfigListeners();
};

export const SubscribeConfig = (listener: ConfigListener) => {
  configListeners.add(listener);
  return () => {
    configListeners.delete(listener);
  };
};

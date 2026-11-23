import { Loading } from "react-admin";
import { createRoot } from "react-dom/client";

import authProvider from "../providers/auth";
import { FetchConfig, GetConfig } from "../utils/config";
import { FetchInstanceConfig, GetInstanceConfig } from "../components/etke.cc/InstanceConfig";
import createLogger from "../utils/logger";

const log = createLogger("auth-callback");

interface AuthProviderLike {
  handleCallback?: () => Promise<{ redirectTo?: string } | void>;
}

interface LocationLike {
  origin: string;
  href: string;
}

const resolveBasePath = (href: string) => {
  try {
    const url = new URL(href);
    let basePath = url.pathname.replace(/\/auth-callback(?:\/index\.html)?\/?$/, "");
    if (basePath.endsWith("/")) {
      basePath = basePath.slice(0, -1);
    }
    return `${url.origin}${basePath}`;
  } catch {
    return "";
  }
};

const redirectToApp = (location: LocationLike, redirectTo: string) => {
  const base = resolveBasePath(location.href) || location.origin;
  const target = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
  location.href = `${base}/#${target}`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error during authentication.";
};

export const runAuthCallback = async (provider: AuthProviderLike): Promise<{ redirectTo?: string } | void> =>
  provider.handleCallback?.();

const ensureBaseTitle = () => {
  if (!document.head.dataset.baseTitle) {
    document.head.dataset.baseTitle = "Ketesa";
  }
  if (!document.title) {
    document.title = "Ketesa";
  }
};

export const bootstrapAuthCallback = (
  rootElement: HTMLElement | null = document.getElementById("root"),
  location: LocationLike = window.location,
  provider: AuthProviderLike = authProvider
): void => {
  ensureBaseTitle();
  const root = rootElement ? createRoot(rootElement) : null;
  root?.render(<Loading loadingPrimary="" loadingSecondary="" />);

  // Fade out and remove the static loader overlay
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.add("fade-out");
    loader.addEventListener("transitionend", () => loader.remove(), { once: true });
  }

  void (async () => {
    await FetchConfig();
    await FetchInstanceConfig(GetConfig().etkeccAdmin, "");
    const icfg = GetInstanceConfig();
    if (icfg.name) {
      document.head.dataset.baseTitle = icfg.name;
      if (!document.title.includes(icfg.name)) {
        document.title = icfg.name;
      }
    }
    return runAuthCallback(provider);
  })()
    .then(result => {
      redirectToApp(location, result?.redirectTo || "/");
    })
    .catch(async error => {
      const message = getErrorMessage(error);
      log.error("OAuth callback error", { href: location.href, message });
      if (!root) {
        return;
      }
      const { renderAuthCallbackError } = await import("./auth-callback-error");
      await renderAuthCallbackError(root, { message, onBack: () => redirectToApp(location, "/login") });
    });
};

declare global {
  interface Window {
    __KETESA_AUTH_CALLBACK_ENTRY__?: boolean;
  }
}

if (typeof window !== "undefined" && window.__KETESA_AUTH_CALLBACK_ENTRY__) {
  bootstrapAuthCallback();
}

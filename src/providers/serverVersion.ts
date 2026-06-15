import { useEffect, useState } from "react";

import { getServerVersion } from "./data/synapse";
import { getMASVersion, isMAS } from "./data/mas";

interface ServerVersions {
  synapse: string;
  mas: string;
}

let cached: ServerVersions | null = null;
let fetchPromise: Promise<ServerVersions> | null = null;
const listeners = new Set<(v: ServerVersions) => void>();

const notify = (v: ServerVersions) => {
  for (const fn of listeners) fn(v);
};

/**
 * Fetch Synapse (and optionally MAS) versions, cache the result.
 * Safe to call multiple times; deduplicates concurrent calls.
 */
export const fetchServerVersions = async (): Promise<ServerVersions> => {
  if (cached) return cached;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const baseUrl = localStorage.getItem("base_url");
    let synapse = "";
    let mas = "";

    if (baseUrl) {
      try {
        synapse = await getServerVersion(baseUrl);
      } catch {
        /* ignore */
      }
    }

    if (isMAS()) {
      try {
        mas = await getMASVersion();
      } catch {
        /* ignore */
      }
    }

    cached = { synapse, mas };
    fetchPromise = null;
    notify(cached);
    return cached;
  })();

  return fetchPromise;
};

/**
 * Clear cached versions (call on logout so next login re-fetches).
 */
export const clearServerVersions = () => {
  cached = null;
  fetchPromise = null;
  notify({ synapse: "", mas: "" });
};

/**
 * React hook that returns { synapse, mas } version strings.
 * Triggers a fetch on mount if not yet cached.
 */
export const useServerVersions = (): ServerVersions => {
  const [versions, setVersions] = useState<ServerVersions>(cached || { synapse: "", mas: "" });

  useEffect(() => {
    // Subscribe to updates
    listeners.add(setVersions);

    // If already cached, sync immediately
    if (cached) {
      setVersions(cached);
    } else if (localStorage.getItem("access_token")) {
      // Only fetch if logged in
      fetchServerVersions();
    }

    return () => {
      listeners.delete(setVersions);
    };
  }, []);

  return versions;
};

import "@testing-library/jest-dom/vitest";
import { expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

const createStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
};

const installStorageGlobals = () => {
  vi.stubGlobal("localStorage", createStorage());
  vi.stubGlobal("sessionStorage", createStorage());
};

installStorageGlobals();

// React's scheduler uses setImmediate for its work loop. Those callbacks can fire after
// jsdom teardown removes window, causing "window is not defined". Guard every callback
// so work is silently skipped once the environment is gone; this is safe because
// any remaining work at that point is already irrelevant to the completed tests.
const _setImmediate = globalThis.setImmediate.bind(globalThis);
vi.stubGlobal("setImmediate", ((fn: (...args: unknown[]) => void, ...args: unknown[]) =>
  _setImmediate(() => {
    if (typeof window !== "undefined") fn(...args);
  })) as typeof setImmediate);

let logSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
  installStorageGlobals();
});

beforeAll(() => {
  if (!vi.isMockFunction(console.log)) {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  } else {
    vi.mocked(console.log).mockImplementation(() => undefined);
  }
});

afterAll(() => {
  logSpy?.mockRestore();
});

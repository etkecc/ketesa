import { describe, it, expect, vi, beforeEach } from "vitest";

// userFilterDefaults is the security boundary for guest-account visibility: under an external
// auth provider it must keep guests hidden, and collapsing it to {} would expose them. The
// branch is exercised here directly; isMAS and GetConfig are the only inputs it reads.

const isMASMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock("../../providers/data/mas", async importOriginal => ({
  ...(await importOriginal<typeof import("../../providers/data/mas")>()),
  isMAS: () => isMASMock(),
}));
vi.mock("../../utils/config", async importOriginal => ({
  ...(await importOriginal<typeof import("../../utils/config")>()),
  GetConfig: () => getConfigMock(),
}));

import { userFilterDefaults } from "./List";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("userFilterDefaults", () => {
  it("returns {} in MAS mode (provider forces guests=false)", () => {
    isMASMock.mockReturnValue(true);
    getConfigMock.mockReturnValue({ externalAuthProvider: true });

    expect(userFilterDefaults()).toEqual({});
  });

  it("hides guests under a non-MAS external auth provider", () => {
    isMASMock.mockReturnValue(false);
    getConfigMock.mockReturnValue({ externalAuthProvider: true });

    expect(userFilterDefaults()).toEqual({ guests: false });
  });

  it("applies no defaults for a non-MAS deployment without external auth", () => {
    isMASMock.mockReturnValue(false);
    getConfigMock.mockReturnValue({ externalAuthProvider: false });

    expect(userFilterDefaults()).toEqual({});
  });

  it("applies no defaults when externalAuthProvider is unset", () => {
    isMASMock.mockReturnValue(false);
    getConfigMock.mockReturnValue({ externalAuthProvider: undefined });

    expect(userFilterDefaults()).toEqual({});
  });
});

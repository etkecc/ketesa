import { createHash } from "node:crypto";

import { sha256Hex } from "./hash";

// Expected values come from Node's own SHA-256, so these fail if our input framing ever drifts.
const digestOf = (parts: string[]) => createHash("sha256").update(JSON.stringify(parts), "utf8").digest("hex");

describe("sha256Hex", () => {
  it("returns the SHA-256 of the JSON-encoded parts", async () => {
    expect(await sha256Hex("@alice:example.org", "maintenance tonight")).toBe(
      digestOf(["@alice:example.org", "maintenance tonight"])
    );
    expect(await sha256Hex("maintenance tonight")).toBe(digestOf(["maintenance tonight"]));
  });

  it("returns 64 lowercase hex chars", async () => {
    expect(await sha256Hex("@alice:example.org", "hi")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across calls", async () => {
    expect(await sha256Hex("@alice:example.org", "hi")).toBe(await sha256Hex("@alice:example.org", "hi"));
  });

  it("changes when any part changes", async () => {
    const base = await sha256Hex("@alice:example.org", "hi");
    expect(await sha256Hex("@alice:example.org", "hi ")).not.toBe(base);
    expect(await sha256Hex("@bob:example.org", "hi")).not.toBe(base);
    expect(await sha256Hex("@alice:example.org", "HI")).not.toBe(base);
  });

  it("keeps part boundaries unambiguous", async () => {
    expect(await sha256Hex("ab", "c")).not.toBe(await sha256Hex("a", "bc"));
    expect(await sha256Hex("ab-c")).not.toBe(await sha256Hex("ab", "c"));
    expect(await sha256Hex("ab")).not.toBe(await sha256Hex("ab", ""));
  });

  it("handles non-ASCII text", async () => {
    expect(await sha256Hex("@alice:example.org", "Технические работы")).toBe(
      digestOf(["@alice:example.org", "Технические работы"])
    );
    expect(await sha256Hex("⚠️")).not.toBe(await sha256Hex("⚠"));
  });

  it("handles empty input", async () => {
    expect(await sha256Hex()).toBe(digestOf([]));
    expect(await sha256Hex("")).toBe(digestOf([""]));
    expect(await sha256Hex()).not.toBe(await sha256Hex(""));
  });
});

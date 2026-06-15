import { describe, expect, it } from "vitest";

import { HierarchyRoom } from "../../providers/types";
import { buildTree, isValidOrder, sortChildren } from "./RoomHierarchy";

const makeChild = (
  state_key: string,
  origin_server_ts: number,
  order?: string
): HierarchyRoom["children_state"][number] => ({
  type: "m.space.child",
  state_key,
  content: { via: ["example.org"], ...(order !== undefined ? { order } : {}) },
  sender: "@admin:example.org",
  origin_server_ts,
});

const makeRoom = (room_id: string, children: HierarchyRoom["children_state"] = []): HierarchyRoom => ({
  room_id,
  num_joined_members: 1,
  guest_can_join: false,
  world_readable: false,
  children_state: children,
});

describe("isValidOrder", () => {
  it("accepts printable ASCII strings", () => {
    expect(isValidOrder("1")).toBe(true);
    expect(isValidOrder("abc")).toBe(true);
    expect(isValidOrder(" ")).toBe(true); // 0x20
    expect(isValidOrder("~")).toBe(true); // 0x7E
  });

  it("rejects empty string", () => {
    expect(isValidOrder("")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidOrder(undefined)).toBe(false);
    expect(isValidOrder(null)).toBe(false);
    expect(isValidOrder(1)).toBe(false);
  });

  it("rejects strings with control characters", () => {
    expect(isValidOrder("\x1F")).toBe(false);
    expect(isValidOrder("\x7F")).toBe(false);
  });

  it("rejects non-ASCII Unicode that would pass naive string comparison", () => {
    expect(isValidOrder("\u0100")).toBe(false); // Ā (codepoint 256, above 0x7E)
    expect(isValidOrder("café")).toBe(false); // é is codepoint 233, above 0x7E
  });
});

describe("sortChildren", () => {
  it("sorts lexicographically by order field", () => {
    const children = [makeChild("!c", 1, "3"), makeChild("!a", 2, "1"), makeChild("!b", 3, "2")];
    const sorted = sortChildren(children).map(c => c.state_key);
    expect(sorted).toEqual(["!a", "!b", "!c"]);
  });

  it("sorts without order by origin_server_ts ascending", () => {
    const children = [makeChild("!c", 300), makeChild("!a", 100), makeChild("!b", 200)];
    const sorted = sortChildren(children).map(c => c.state_key);
    expect(sorted).toEqual(["!a", "!b", "!c"]);
  });

  it("places ordered children before unordered", () => {
    const children = [makeChild("!unordered", 1), makeChild("!ordered", 999, "1")];
    const sorted = sortChildren(children).map(c => c.state_key);
    expect(sorted).toEqual(["!ordered", "!unordered"]);
  });

  it("treats empty string order as no order", () => {
    const children = [makeChild("!empty-order", 1, ""), makeChild("!ordered", 999, "1")];
    const sorted = sortChildren(children).map(c => c.state_key);
    expect(sorted).toEqual(["!ordered", "!empty-order"]);
  });

  it("falls back to origin_server_ts then state_key when order values are equal", () => {
    const children = [makeChild("!z", 2, "1"), makeChild("!a", 1, "1")];
    const sorted = sortChildren(children).map(c => c.state_key);
    expect(sorted).toEqual(["!a", "!z"]);
  });

  it("uses state_key as final tiebreaker when origin_server_ts equal and no order", () => {
    const children = [makeChild("!z", 100), makeChild("!a", 100)];
    const sorted = sortChildren(children).map(c => c.state_key);
    expect(sorted).toEqual(["!a", "!z"]);
  });

  it("does not mutate the original array", () => {
    const children = [makeChild("!b", 1, "2"), makeChild("!a", 2, "1")];
    const original = [...children];
    sortChildren(children);
    expect(children).toEqual(original);
  });
});

describe("buildTree", () => {
  it("returns empty array for empty input", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("respects order field when building children", () => {
    const root = makeRoom("!root", [makeChild("!c", 1, "3"), makeChild("!a", 2, "1"), makeChild("!b", 3, "2")]);
    const roomA = makeRoom("!a");
    const roomB = makeRoom("!b");
    const roomC = makeRoom("!c");
    const [rootNode] = buildTree([root, roomC, roomA, roomB]);
    expect(rootNode.children.map(n => n.room.room_id)).toEqual(["!a", "!b", "!c"]);
  });

  it("handles cycle detection correctly after sort", () => {
    const roomA = makeRoom("!a", [makeChild("!b", 1)]);
    const roomB = makeRoom("!b", [makeChild("!a", 2)]);
    const [rootNode] = buildTree([roomA, roomB]);
    expect(rootNode.children).toHaveLength(1);
    expect(rootNode.children[0].children).toHaveLength(0);
  });

  it("appends orphan rooms after root", () => {
    const root = makeRoom("!root");
    const orphan = makeRoom("!orphan");
    const nodes = buildTree([root, orphan]);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].room.room_id).toBe("!root");
    expect(nodes[1].room.room_id).toBe("!orphan");
  });
});

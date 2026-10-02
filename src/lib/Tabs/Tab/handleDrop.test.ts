import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleInnerDrop } from "../TabsGroup/handleInnerDrop.ts";
import { GroupItem, TabItem } from "../types.ts";
import { handleDrop } from "./handleDrop.ts";

/**
 * A drop handler's promise is how `App` learns the drop is finished, and
 * whether Chrome refused it.
 *
 * These handlers used to start the move with `void` and return at once, and
 * to swallow a refused group move with a `console.error`. `App` awaited them
 * all the same, so it cleared a dropped selection before the move had run, and
 * its "that could not be moved" never fired for the drops most likely to be
 * refused. Found by the pre-push review, 2026-10-02.
 */

const tab = (over: Partial<TabItem> = {}): TabItem => ({
  type: "tab",
  id: 1,
  index: 0,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: "A tab",
  ...over,
});

const group = (over: Partial<GroupItem> = {}): GroupItem => ({
  type: "group",
  id: 500,
  collapsed: false,
  color: "blue",
  windowId: 1,
  title: "Work",
  tabs: [tab({ id: 7, index: 4, groupId: 500 })],
  ...over,
});

const zone = <T>(type: string, data: T) => ({ type, data });

const refusal = new Error("Tabs cannot be moved there.");

beforeEach(() => {
  // The shared stub has no `ungroup` and no `tabGroups.move`; the handlers
  // call both.
  Object.assign(chrome.tabs, { ungroup: vi.fn(async () => undefined) });
  Object.assign(chrome.tabGroups, { move: vi.fn(async () => undefined) });
});

describe("a drop on a tab", () => {
  it.each([
    ["one tab", tab()],
    ["a selection", [tab(), tab({ id: 2, index: 1 })]],
  ])("has moved %s by the time it resolves", async (_name, dropped) => {
    await handleDrop(dropped, zone("tab", tab({ id: 9, index: 5 })));

    // Two moves: out to the end, then to the target's place.
    expect(chrome.tabs.move).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.move).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ windowId: 1 }),
    );
  });

  it.each([
    ["one tab", tab()],
    ["a selection", [tab(), tab({ id: 2, index: 1 })]],
  ])("rejects when Chrome refuses to move %s", async (_name, dropped) => {
    vi.mocked(chrome.tabs.move).mockRejectedValue(refusal);

    await expect(
      handleDrop(dropped, zone("tab", tab({ id: 9, index: 5 }))),
    ).rejects.toBe(refusal);
  });

  // The case the old `catch` hid: Chrome refuses a group dropped into the
  // middle of another group, and the handler logged it and resolved.
  it("rejects when Chrome refuses a group moved within its window", async () => {
    vi.mocked(chrome.tabGroups.move).mockRejectedValue(refusal);

    await expect(
      handleDrop(group(), zone("tab", tab({ id: 9, index: 5 }))),
    ).rejects.toBe(refusal);
  });

  it("moves a group to the target's place", async () => {
    await handleDrop(group(), zone("tab", tab({ id: 9, index: 2 })));

    expect(chrome.tabGroups.move).toHaveBeenCalledWith(500, { index: 2 });
  });
});

describe("a selection dropped into a group", () => {
  it("has moved by the time it resolves, and rejects when refused", async () => {
    const selection = [tab(), tab({ id: 2, index: 1 })];
    const target = zone("group-inner", group());

    await handleInnerDrop(selection, target);
    expect(chrome.tabs.move).toHaveBeenCalledTimes(2);

    vi.mocked(chrome.tabs.move).mockRejectedValue(refusal);
    await expect(handleInnerDrop(selection, target)).rejects.toBe(refusal);
  });
});

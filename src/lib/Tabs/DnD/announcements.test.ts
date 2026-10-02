import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GroupItem, TabItem } from "../types.ts";
import { dragAnnouncements, dragInstructions } from "./announcements.ts";
import type { DefaultDrag } from "./useDropzone.tsx";

/**
 * The wording, as strings. jsdom cannot drive dnd-kit's collision detection, so
 * these call the announcements the way dnd-kit's Accessibility component does —
 * with `{ active, over }` whose `data.current` carries what the row registered —
 * and the integration half (that dnd-kit speaks them) is in App.test.tsx.
 *
 * Ids are deliberately large and distinctive: the point of AC-15 is that none of
 * them is ever heard.
 */

const tab = (over: Partial<TabItem> = {}): TabItem => ({
  type: "tab",
  id: 2877238473,
  index: 4,
  windowId: 91,
  groupId: -1,
  active: false,
  highlighted: false,
  title: "Quarterly report",
  ...over,
});

const group = (over: Partial<GroupItem> = {}): GroupItem => ({
  type: "group",
  id: 5550123,
  collapsed: false,
  color: "blue",
  windowId: 91,
  tabs: [],
  title: "Work",
  ...over,
});

type Args = Parameters<typeof dragAnnouncements.onDragOver>[0];

const arg = (drag: DefaultDrag | undefined, zone?: unknown | null): Args =>
  ({
    active: { id: 8675309, data: { current: drag } },
    over:
      zone === undefined || zone === null
        ? null
        : { id: "zone--9", data: { current: zone } },
  }) as unknown as Args;

const zone = (type: string, data: unknown) => ({ type, data });

const over = (drag: DefaultDrag | undefined, z?: unknown) =>
  dragAnnouncements.onDragOver(arg(drag, z));
const drop = (drag: DefaultDrag | undefined, z?: unknown) =>
  dragAnnouncements.onDragEnd(arg(drag, z));

// The pick-up sentence is remembered for a moment so the first place can carry
// it (see `pickedUp`). Ending a drag forgets it, so each test starts clean.
beforeEach(() => {
  dragAnnouncements.onDragCancel(arg(tab()));
});

const ID = /2877238473|5550123|8675309|zone--|tab--|group--|window-end|in-window|\b91\b/;

describe("subject", () => {
  it("is a tab's title, or 'untitled tab' when it has none", () => {
    expect(dragAnnouncements.onDragStart(arg(tab()))).toBe(
      "Picked up Quarterly report.",
    );
    expect(dragAnnouncements.onDragStart(arg(tab({ title: undefined })))).toBe(
      "Picked up untitled tab.",
    );
    expect(dragAnnouncements.onDragStart(arg(tab({ title: "   " })))).toBe(
      "Picked up untitled tab.",
    );
  });

  it("is 'group <title>', or 'group Untitled'", () => {
    expect(dragAnnouncements.onDragStart(arg(group()))).toBe(
      "Picked up group Work.",
    );
    expect(dragAnnouncements.onDragStart(arg(group({ title: undefined })))).toBe(
      "Picked up group Untitled.",
    );
    expect(dragAnnouncements.onDragStart(arg(group({ title: "" })))).toBe(
      "Picked up group Untitled.",
    );
  });

  it("is a count for a selection, in the singular for one", () => {
    expect(dragAnnouncements.onDragStart(arg([tab(), tab({ id: 7 })]))).toBe(
      "Picked up 2 tabs.",
    );
    expect(dragAnnouncements.onDragStart(arg([tab()]))).toBe(
      "Picked up 1 tab.",
    );
  });

  it("has a word for a drag whose data is missing, and does not throw", () => {
    expect(dragAnnouncements.onDragStart(arg(undefined))).toBe(
      "Picked up item.",
    );
  });

  // The hostile title (§11, AC-24). The assertion that matters is that the
  // string is the title *verbatim* — nothing escapes it, strips it or
  // interprets it — because dnd-kit renders a string as a text node. The DOM
  // half of that is in App.test.tsx, which reads it back out of the live region.
  it("carries a hostile title through as literal text", () => {
    const hostile = `"><img src=x onerror=alert(1)>`;
    expect(dragAnnouncements.onDragStart(arg(tab({ title: hostile })))).toBe(
      `Picked up ${hostile}.`,
    );
    expect(drop(tab({ title: hostile }))).toBe(`${hostile} put back.`);
    expect(
      over(tab(), zone("tab", tab({ id: 3, title: hostile }))),
    ).toBe(`Before ${hostile}.`);
    expect(
      over(tab(), zone("group-inner", group({ title: hostile }))),
    ).toBe(`Into group ${hostile}.`);
  });
});

describe("while a drag is over a zone", () => {
  it("says 'Before <tab>' over a tab", () => {
    expect(
      over(tab(), zone("tab", tab({ id: 3, title: "Inbox" }))),
    ).toBe("Before Inbox.");
    expect(over(tab(), zone("tab", tab({ id: 3, title: undefined })))).toBe(
      "Before untitled tab.",
    );
  });

  // `handleDrop` for tabs ends in `chrome.tabs.group` when the target belongs
  // to a group, so "before" alone would under-describe what dropping does.
  it("says the tab would join the group when the target tab is in one", () => {
    expect(
      over(tab(), zone("tab", tab({ id: 3, title: "Inbox", groupId: 5550123 }))),
    ).toBe("Before Inbox, in its group.");
    // A dragged group is moved by tabGroups.move, never into another group.
    expect(
      over(group(), zone("tab", tab({ id: 3, title: "Inbox", groupId: 8 }))),
    ).toBe("Before Inbox.");
  });

  it("says 'Before group <name>' over a group's header", () => {
    expect(over(tab(), zone("group", group({ id: 8, title: "Play" })))).toBe(
      "Before group Play.",
    );
    expect(over(tab(), zone("group", group({ id: 8, title: undefined })))).toBe(
      "Before group Untitled.",
    );
    expect(over(group(), zone("group", group({ id: 8, title: "Play" })))).toBe(
      "Before group Play.",
    );
  });

  it("says 'Into group <name>' over a group's inner half", () => {
    expect(
      over(tab(), zone("group-inner", group({ id: 8, title: "Play" }))),
    ).toBe("Into group Play.");
    expect(
      over([tab(), tab({ id: 4 })], zone("group-inner", group({ id: 8, title: "Play" }))),
    ).toBe("Into group Play.");
  });

  it("says the end and the start of a window", () => {
    expect(over(tab(), zone("window-end", { id: 91 }))).toBe("End of window.");
    expect(over(group(), zone("in-window", { id: 91 }))).toBe(
      "Start of window.",
    );
  });

  it("says where it started over its own place", () => {
    expect(over(tab(), zone("tab", tab()))).toBe(
      "Quarterly report, where it started.",
    );
    expect(over(group(), zone("group", group()))).toBe(
      "Group Work, where it started.",
    );
  });

  // Found in review: `handleDrop` moves a selection wherever it is dropped,
  // including onto one of its own tabs, so "where it started" was contradicted
  // by the drop that followed it.
  it("never calls a selection's own tab its own place, because the drop moves it", () => {
    const selection = [tab(), tab({ id: 7, title: "Inbox" })];
    const ownTab = zone("tab", tab({ id: 7, title: "Inbox" }));

    expect(over(selection, ownTab)).toBe("Before Inbox.");
    expect(drop(selection, ownTab)).toBe("Moved 2 tabs before Inbox.");
  });

  it("is silent over nothing, over a zone that would do nothing, and over one it has no words for", () => {
    expect(over(tab(), undefined)).toBeUndefined();
    // handleInnerDrop returns without acting for a group.
    expect(
      over(group(), zone("group-inner", group({ id: 8 }))),
    ).toBeUndefined();
    expect(over(tab(), zone("not-a-zone", tab()))).toBeUndefined();
    expect(over(tab(), zone("tab", "not a tab"))).toBeUndefined();
    expect(
      dragAnnouncements.onDragOver({
        active: { id: 1, data: { current: tab() } },
        over: { id: "x", data: { current: undefined } },
      } as unknown as Args),
    ).toBeUndefined();
  });
});

describe("on drop", () => {
  it("says what moved and where", () => {
    expect(drop(tab(), zone("tab", tab({ id: 3, title: "Inbox" })))).toBe(
      "Moved Quarterly report before Inbox.",
    );
    expect(
      drop(
        tab(),
        zone("tab", tab({ id: 3, title: "Inbox", groupId: 5550123 })),
      ),
    ).toBe("Moved Quarterly report before Inbox, in its group.");
    expect(drop(tab(), zone("group", group({ id: 8, title: "Play" })))).toBe(
      "Moved Quarterly report before group Play.",
    );
    expect(
      drop(tab(), zone("group-inner", group({ id: 8, title: "Play" }))),
    ).toBe("Moved Quarterly report into group Play.");
    expect(drop(group(), zone("window-end", { id: 91 }))).toBe(
      "Moved group Work to the end of the window.",
    );
    expect(drop([tab(), tab({ id: 7 })], zone("in-window", { id: 91 }))).toBe(
      "Moved 2 tabs to the start of the window.",
    );
  });

  it("says it was put back when dropped on nothing, or on its own place", () => {
    expect(drop(tab(), undefined)).toBe("Quarterly report put back.");
    expect(drop(group(), undefined)).toBe("Group Work put back.");
    expect(drop(tab({ title: undefined }), undefined)).toBe("Untitled tab put back.");
    expect(drop([tab()], undefined)).toBe("1 tab put back.");
    expect(drop(tab(), zone("tab", tab()))).toBe("Quarterly report put back.");
    expect(drop(group(), zone("group-inner", group({ id: 8 })))).toBe(
      "Group Work put back.",
    );
  });

  // Claiming "moved" for a zone nobody wrote words for would be a guess, and
  // "put back" would be a lie if its handler did move the thing.
  it("does not claim a move it cannot describe, and does not throw", () => {
    expect(drop(tab(), zone("not-a-zone", tab({ id: 3 })))).toBe(
      "Dropped Quarterly report.",
    );
    expect(drop(undefined, zone("not-a-zone", {}))).toBe("Dropped item.");
  });
});

describe("on cancel", () => {
  it("says it was put back", () => {
    expect(dragAnnouncements.onDragCancel(arg(tab()))).toBe(
      "Cancelled. Quarterly report put back.",
    );
    expect(dragAnnouncements.onDragCancel(arg(group()))).toBe(
      "Cancelled. Group Work put back.",
    );
    expect(dragAnnouncements.onDragCancel(arg([tab(), tab()]))).toBe(
      "Cancelled. 2 tabs put back.",
    );
  });
});

describe("everything it says", () => {
  // AC-15, from the other direction: whatever the inputs, no id, zone key or
  // window number is ever spoken. The ids above are distinctive on purpose.
  it("never speaks an id", () => {
    const targets = [
      zone("tab", tab({ id: 3, groupId: 5550123 })),
      zone("tab", tab()),
      zone("group", group({ id: 8, title: undefined })),
      zone("group", group()),
      zone("group-inner", group({ id: 8 })),
      zone("window-end", { id: 91 }),
      zone("in-window", { id: 91 }),
      zone("not-a-zone", { id: 91, type: "tab" }),
      zone("tab", undefined),
      undefined,
    ];
    const drags = [
      tab(),
      tab({ title: undefined }),
      group(),
      group({ title: undefined }),
      [tab(), tab({ id: 7 })],
      undefined,
    ];
    const said: string[] = [];
    for (const drag of drags) {
      said.push(
        dragAnnouncements.onDragStart(arg(drag)) ?? "",
        dragAnnouncements.onDragCancel(arg(drag)) ?? "",
      );
      for (const target of targets) {
        said.push(over(drag, target) ?? "", drop(drag, target) ?? "");
      }
    }

    expect(said.length).toBeGreaterThan(50);
    for (const line of said) expect(line).not.toMatch(ID);
  });

  it("has no handler for continuous movement", () => {
    // onDragMove fires on every frame; speaking it would be a stream.
    expect(dragAnnouncements.onDragMove).toBeUndefined();
  });
});

describe("the instructions", () => {
  it("name the keys the sensor binds", () => {
    expect(dragInstructions.draggable).toBe(
      "Press Space or Enter to pick up. Arrow keys move it, Space or Enter drops it, Escape cancels.",
    );
  });
});

/**
 * A tab row is removed as it is picked up, the next row slides under the drag,
 * and dnd-kit reports it at once. Measured in a browser: "Picked up X." stood
 * for 55 ms before "Before Y." replaced it.
 */
describe("the pick-up, and the first place after it", () => {
  const inbox = zone("tab", tab({ id: 3, title: "Inbox" }));
  const later = zone("tab", tab({ id: 4, title: "Calendar" }));

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carries the pick-up into the first place, once", () => {
    expect(dragAnnouncements.onDragStart(arg(tab()))).toBe(
      "Picked up Quarterly report.",
    );

    expect(over(tab(), inbox)).toBe("Picked up Quarterly report. Before Inbox.");
    expect(over(tab(), later)).toBe("Before Calendar.");
  });

  it("repeats the pick-up over its own place, so nothing cuts it off", () => {
    dragAnnouncements.onDragStart(arg(group()));

    // The same text again is no change to the live region, so it is not re-read.
    expect(over(group(), zone("group", group()))).toBe("Picked up group Work.");
    // And the first real place still carries it.
    expect(over(group(), inbox)).toBe("Picked up group Work. Before Inbox.");
  });

  it("is not held back by a gap between rows", () => {
    dragAnnouncements.onDragStart(arg(tab()));

    expect(over(tab(), undefined)).toBeUndefined();
    expect(over(tab(), inbox)).toBe("Picked up Quarterly report. Before Inbox.");
  });

  it("stands alone once it has had time to be heard", () => {
    vi.useFakeTimers();
    dragAnnouncements.onDragStart(arg(tab()));
    vi.advanceTimersByTime(501);

    expect(over(tab(), inbox)).toBe("Before Inbox.");
    expect(over(tab(), zone("tab", tab()))).toBe(
      "Quarterly report, where it started.",
    );
  });

  it.each([
    ["a drop", () => drop(tab(), undefined)],
    ["a cancel", () => dragAnnouncements.onDragCancel(arg(tab()))],
  ])("is forgotten after %s", (_name, end) => {
    dragAnnouncements.onDragStart(arg(tab()));
    end();

    expect(over(tab(), inbox)).toBe("Before Inbox.");
  });
});

/**
 * A browser-side `chrome.*` stand-in, so the real App can be rendered and
 * measured outside an extension.
 *
 * This exists because the layout questions in SPEC-01 §5.7 — does anything
 * scroll sideways at 400px, is the list still usable once the selection
 * toolbar eats 75px of a 640px window — are answerable without a real
 * Picture-in-Picture window, and guessing at them from arithmetic is worse
 * than looking.
 *
 * It is NOT a substitute for the float. Anything about focus, clamping, or a
 * drag released outside the window has to be checked in Chrome.
 *
 * Deliberately separate from src/test/chromeStub.ts: that one is built on
 * vitest's `vi.fn`, which has no business in a browser bundle.
 */

/**
 * A real event, not a stub. The harness is worth much more when acting on it
 * actually changes something: close a tab and the list updates, the undo toast
 * appears, and the layout can be measured in the state it will really be in.
 */
type Listener = (...args: never[]) => void;
const event = () => {
  const listeners = new Set<Listener>();
  return {
    addListener: (fn: Listener) => listeners.add(fn),
    removeListener: (fn: Listener) => listeners.delete(fn),
    hasListener: (fn: Listener) => listeners.has(fn),
    fire: (...args: never[]) => {
      listeners.forEach((fn) => {
        fn(...args);
      });
    },
  };
};

const TITLES: [string, string][] = [
  [
    "Using the Document Picture-in-Picture API - Web APIs | MDN",
    "https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API",
  ],
  [
    "chrome.sidePanel | API | Chrome for Developers",
    "https://developer.chrome.com/docs/extensions/reference/api/sidePanel",
  ],
  [
    "RostK/conscious-tabs: A quieter way to handle tab overload",
    "https://github.com/RostK/conscious-tabs",
  ],
  [
    "Show a speaker badge on tabs that are playing sound by RostK",
    "https://github.com/RostK/conscious-tabs/pull/4",
  ],
  ["Inbox (12) - Gmail", "https://mail.google.com/mail/u/0/#inbox"],
  [
    "Google Calendar - Week of 20 September 2026",
    "https://calendar.google.com/calendar/u/0/r",
  ],
  [
    "A very long tab title that keeps going and going well past any reasonable width to see how it truncates",
    "https://example.com/some/deep/path/that/is/also/quite/long/indeed",
  ],
  ["", "https://untitled.example.com/"],
  ["مرحبا بالعالم — right to left title", "https://rtl.example.com/"],
  [
    "Solve Algorithms | HackerRank",
    "https://www.hackerrank.com/domains/algorithms",
  ],
  ["Anthropic Courses", "https://anthropic.skilljar.com/"],
  [
    "jj-vcs/jj: A Git-compatible VCS that is both simple and powerful",
    "https://github.com/jj-vcs/jj",
  ],
  [
    "OpenSpec | A lightweight and configurable spec framework",
    "https://openspec.dev/",
  ],
  ["Future: UK · Events Calendar", "https://luma.com/ldn"],
  [
    "Written questions and answers - UK Parliament",
    "https://questions-statements.parliament.uk/written-questions",
  ],
  [
    "Google Flow – AI creative studio for video, images",
    "https://flow.google.com/",
  ],
  ["Google Antigravity - Download", "https://antigravity.google/download"],
  [
    "Finding the Holy Grail of AI Agent UIs",
    "https://mlops.community/blog/finding-the-holy-grail-of-ai-agent-uis/",
  ],
];

const tabs: chrome.tabs.Tab[] = TITLES.map((entry, i) => {
  const [title, url] = entry;
  return {
    id: 100 + i,
    index: i,
    // Two windows, and two groups inside the first one.
    windowId: i < 12 ? 1 : 2,
    groupId: i >= 3 && i <= 6 ? 500 : i === 9 || i === 10 ? 501 : -1,
    title,
    url,
    favIconUrl: "",
    active: i === 0,
    highlighted: i === 0,
    pinned: i < 2,
    audible: i === 4 || i === 5,
    mutedInfo: { muted: i === 5 },
    selected: false,
    discarded: false,
    autoDiscardable: true,
    incognito: false,
  } as unknown as chrome.tabs.Tab;
});

const windows: chrome.windows.Window[] = [
  {
    id: 1,
    focused: true,
    type: "normal",
    state: "normal",
    incognito: false,
    alwaysOnTop: false,
  } as chrome.windows.Window,
  {
    id: 2,
    focused: false,
    type: "normal",
    state: "normal",
    incognito: false,
    alwaysOnTop: false,
  } as chrome.windows.Window,
];

const groups: chrome.tabGroups.TabGroup[] = [
  {
    id: 500,
    title: "Reading",
    color: "purple",
    collapsed: false,
    windowId: 1,
  } as chrome.tabGroups.TabGroup,
  // The long-name case, for the same reason TITLES carries a long tab title:
  // a group row's controls sit over the right end of its text box, and a name
  // short enough to stop before them — "Reading" — never shows what happens
  // there. This one is long enough to reach them at 400px wide.
  {
    id: 501,
    title: "A group name long enough to run under the row's own controls",
    color: "cyan",
    collapsed: false,
    windowId: 1,
  } as chrome.tabGroups.TabGroup,
];

export const installFakeChrome = () => {
  // The fixtures, reachable from the console. Queries hand out clones now,
  // as the real chrome.* does, so a probe cannot make a change happen by
  // mutating what it was given — it has to change the data the fake serves.
  (globalThis as unknown as { harnessTabs: unknown }).harnessTabs = tabs;
  (globalThis as unknown as { harnessGroups: unknown }).harnessGroups = groups;
  const onRemoved = event();
  const onUpdated = event();
  const onActivated = event();
  const onMoved = event();

  const remove = (ids: number | number[]) => {
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list) {
      const at = tabs.findIndex((tab) => tab.id === id);
      if (at >= 0) tabs.splice(at, 1);
    }
    // Fire, so the views re-query and SyncPrompt raises its undo toast.
    list.forEach((id) => {
      (onRemoved.fire as (...a: unknown[]) => void)(id, {
        windowId: 1,
        isWindowClosing: false,
      });
    });
    return Promise.resolve();
  };

  // Real moves, for the same reason `remove` is real: a keyboard drop that
  // changes nothing cannot show whether focus survives the list re-rendering
  // around the moved row — and when the row changes parent (into a group, out
  // of one) it does not survive unaided. Measured 2026-10-02.
  const idsOf = (ids: number | number[]) => (Array.isArray(ids) ? ids : [ids]);
  const move = (
    ids: number | number[],
    to: { index: number; windowId?: number },
  ) => {
    const moving = idsOf(ids)
      .map((id) => tabs.find((tab) => tab.id === id))
      .filter((tab): tab is chrome.tabs.Tab => tab !== undefined);
    if (!moving.length) return Promise.resolve();
    const windowId = to.windowId ?? moving[0].windowId;
    for (const tab of moving) tabs.splice(tabs.indexOf(tab), 1);
    const inWindow = tabs.filter((tab) => tab.windowId === windowId);
    const others = tabs.filter((tab) => tab.windowId !== windowId);
    const at = to.index < 0 ? inWindow.length : to.index;
    inWindow.splice(Math.min(at, inWindow.length), 0, ...moving);
    moving.forEach((tab) => {
      tab.windowId = windowId;
    });
    tabs.length = 0;
    tabs.push(...inWindow, ...others);
    // Every window, not only the destination: a tab that left one leaves a
    // gap in its numbering, and the next drop there lands one slot late.
    const seen = new Map<number, number>();
    tabs.sort((a, b) => a.windowId - b.windowId);
    tabs.forEach((tab) => {
      const next = seen.get(tab.windowId) ?? 0;
      tab.index = next;
      seen.set(tab.windowId, next + 1);
    });
    (onMoved.fire as (...a: unknown[]) => void)(moving[0].id, {
      windowId,
      fromIndex: 0,
      toIndex: to.index,
    });
    return Promise.resolve();
  };
  const setGroup = (ids: number | number[], groupId: number) => {
    idsOf(ids).forEach((id) => {
      const tab = tabs.find((candidate) => candidate.id === id);
      if (tab) tab.groupId = groupId;
    });
    (onUpdated.fire as (...a: unknown[]) => void)(idsOf(ids)[0], { groupId }, {});
  };

  const onGroupUpdated = event();
  const fireGroup = (group: chrome.tabGroups.TabGroup) => {
    (onGroupUpdated.fire as (...a: unknown[]) => void)(group);
  };
  // A group moves as the block of its tabs, and keeps them grouped.
  const moveGroup = (
    groupId: number,
    to: { index: number; windowId?: number },
  ) => {
    const group = groups.find((candidate) => candidate.id === groupId);
    const ids = tabs
      .filter((tab) => tab.groupId === groupId)
      .map((tab) => tab.id as number);
    if (!group || !ids.length) return Promise.resolve(group);
    if (to.windowId !== undefined) group.windowId = to.windowId;
    void move(ids, to);
    fireGroup(group);
    return Promise.resolve(group);
  };
  let nextGroupId = 600;

  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      id: "harness",
      getURL: (path: string) => `chrome-extension://harness/${path}`,
      // SelectionContext subscribes to this to keep surfaces in step.
      onMessage: event(),
      sendMessage: () => Promise.resolve(undefined),
    },
    tabs: {
      // Cloned, as the real chrome.* does across its process boundary.
      query: (info: chrome.tabs.QueryInfo = {}) =>
        Promise.resolve(
          structuredClone(tabs).filter(
            (tab) =>
              (info.windowId === undefined || tab.windowId === info.windowId) &&
              (info.active === undefined || tab.active === info.active),
          ),
        ),
      getCurrent: () => Promise.resolve(undefined),
      update: () => Promise.resolve(undefined),
      create: () => Promise.resolve(undefined),
      remove,
      move,
      group: (options: { tabIds: number | number[]; groupId?: number }) => {
        let groupId = options.groupId;
        if (groupId === undefined) {
          // A new group has to exist, or its tabs render as ungrouped.
          groupId = nextGroupId;
          nextGroupId += 1;
          const first = tabs.find(
            (tab) => tab.id === idsOf(options.tabIds)[0],
          );
          groups.push({
            id: groupId,
            title: "",
            color: "grey",
            collapsed: false,
            windowId: first?.windowId ?? 1,
          } as chrome.tabGroups.TabGroup);
        }
        setGroup(options.tabIds, groupId);
        return Promise.resolve(groupId);
      },
      ungroup: (ids: number | number[]) => {
        setGroup(ids, -1);
        return Promise.resolve();
      },
      duplicate: () => Promise.resolve(undefined),
      reload: () => Promise.resolve(undefined),
      onUpdated,
      onActivated,
      onCreated: event(),
      onRemoved,
      onMoved,
      onDetached: event(),
      onAttached: event(),
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      query: () => Promise.resolve(structuredClone(groups)),
      // Real, so the chevron collapses its group and a rename shows.
      update: (id: number, changes: Partial<chrome.tabGroups.TabGroup>) => {
        const group = groups.find((candidate) => candidate.id === id);
        if (group) {
          Object.assign(group, changes);
          fireGroup(group);
        }
        return Promise.resolve(group);
      },
      move: moveGroup,
      onUpdated: onGroupUpdated,
    },
    windows: {
      WINDOW_ID_NONE: -1,
      getAll: () => Promise.resolve(windows),
      getCurrent: () => Promise.resolve(windows[0]),
      getLastFocused: () => Promise.resolve(windows[0]),
      get: (id: number) => Promise.resolve(windows.find((w) => w.id === id)),
      update: () => Promise.resolve(undefined),
      create: () => Promise.resolve({ id: 99 }),
      remove: () => Promise.resolve(undefined),
      onRemoved: event(),
      onCreated: event(),
      onFocusChanged: event(),
    },
    sidePanel: {
      open: () => Promise.resolve(undefined),
      setPanelBehavior: () => Promise.resolve(undefined),
      setOptions: () => Promise.resolve(undefined),
    },
    sessions: {
      MAX_SESSION_RESULTS: 25,
      // A closed entry to restore, so the undo toast actually appears and its
      // position can be checked against the fixed control bar.
      getRecentlyClosed: () =>
        Promise.resolve([
          { lastModified: Date.now(), tab: { sessionId: "fake-session" } },
        ]),
      restore: () => Promise.resolve(undefined),
    },
  };
};

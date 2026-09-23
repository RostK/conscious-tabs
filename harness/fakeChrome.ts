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
  ["Using the Document Picture-in-Picture API - Web APIs | MDN", "https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API"],
  ["chrome.sidePanel | API | Chrome for Developers", "https://developer.chrome.com/docs/extensions/reference/api/sidePanel"],
  ["RostK/conscious-tabs: A quieter way to handle tab overload", "https://github.com/RostK/conscious-tabs"],
  ["Show a speaker badge on tabs that are playing sound by RostK", "https://github.com/RostK/conscious-tabs/pull/4"],
  ["Inbox (1,284) - rkaniuchenko@gmail.com - Gmail", "https://mail.google.com/mail/u/0/#inbox"],
  ["Google Calendar - Week of 20 September 2026", "https://calendar.google.com/calendar/u/0/r"],
  ["A very long tab title that keeps going and going well past any reasonable width to see how it truncates", "https://example.com/some/deep/path/that/is/also/quite/long/indeed"],
  ["", "https://untitled.example.com/"],
  ["مرحبا بالعالم — right to left title", "https://rtl.example.com/"],
  ["Solve Algorithms | HackerRank", "https://www.hackerrank.com/domains/algorithms"],
  ["Anthropic Courses", "https://anthropic.skilljar.com/"],
  ["jj-vcs/jj: A Git-compatible VCS that is both simple and powerful", "https://github.com/jj-vcs/jj"],
  ["OpenSpec | A lightweight and configurable spec framework", "https://openspec.dev/"],
  ["Future: UK · Events Calendar", "https://luma.com/ldn"],
  ["Written questions and answers - UK Parliament", "https://questions-statements.parliament.uk/written-questions"],
  ["Google Flow – AI creative studio for video, images", "https://flow.google.com/"],
  ["Google Antigravity - Download", "https://antigravity.google/download"],
  ["Finding the Holy Grail of AI Agent UIs", "https://mlops.community/blog/finding-the-holy-grail-of-ai-agent-uis/"],
];

const tabs: chrome.tabs.Tab[] = TITLES.map((entry, i) => {
  const [title, url] = entry;
  return {
    id: 100 + i,
    index: i,
    // Two windows, and a group inside the first one.
    windowId: i < 12 ? 1 : 2,
    groupId: i >= 3 && i <= 6 ? 500 : -1,
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
  { id: 1, focused: true, type: "normal", state: "normal", incognito: false, alwaysOnTop: false } as chrome.windows.Window,
  { id: 2, focused: false, type: "normal", state: "normal", incognito: false, alwaysOnTop: false } as chrome.windows.Window,
];

const groups: chrome.tabGroups.TabGroup[] = [
  { id: 500, title: "Reading", color: "purple", collapsed: false, windowId: 1 } as chrome.tabGroups.TabGroup,
];

export const installFakeChrome = () => {
  const onRemoved = event();
  const onUpdated = event();
  const onActivated = event();

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

  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      id: "harness",
      getURL: (path: string) => `chrome-extension://harness/${path}`,
      // SelectionContext subscribes to this to keep surfaces in step.
      onMessage: event(),
      sendMessage: () => Promise.resolve(undefined),
    },
    tabs: {
      query: (info: chrome.tabs.QueryInfo = {}) =>
        Promise.resolve(
          tabs.filter(
            (tab) =>
              (info.windowId === undefined || tab.windowId === info.windowId) &&
              (info.active === undefined || tab.active === info.active),
          ),
        ),
      getCurrent: () => Promise.resolve(undefined),
      update: () => Promise.resolve(undefined),
      create: () => Promise.resolve(undefined),
      remove,
      move: () => Promise.resolve(undefined),
      group: () => Promise.resolve(1),
      duplicate: () => Promise.resolve(undefined),
      reload: () => Promise.resolve(undefined),
      onUpdated,
      onActivated,
      onRemoved,
      onMoved: event(),
      onDetached: event(),
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      query: () => Promise.resolve(groups),
      update: () => Promise.resolve(undefined),
      onUpdated: event(),
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

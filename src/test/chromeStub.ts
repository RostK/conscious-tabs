import { vi } from "vitest";

/**
 * A hand-rolled `chrome.*` stub.
 *
 * Two things about this codebase force it to be installed *globally, before any
 * module under test is imported*, rather than per-test:
 *
 *   - `useTabsStructure.ts` runs `import TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE`
 *     at module scope.
 *   - `SyncPrompt.tsx` reads `chrome.sessions.MAX_SESSION_RESULTS` at module scope.
 *
 * Either one throws on import if `chrome` is missing. `setup.ts` therefore
 * installs a baseline stub before the suite runs; individual tests call
 * `installChrome()` again with the fixtures they need.
 */

export const EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}/`;

/** A `chrome.*.onFoo` event that records its listeners without firing them. */
const event = () => ({
  addListener: vi.fn(),
  removeListener: vi.fn(),
  hasListener: vi.fn(() => false),
});

/**
 * Chrome match patterns compare the pattern's path against path *plus query*,
 * so `chrome-extension://<id>/*` matches `index.html?host=anchor`. Only the
 * trailing-wildcard form the app actually uses is supported.
 */
const matchesPattern = (pattern: string, url?: string): boolean => {
  if (!url) return false;
  return pattern.endsWith("*")
    ? url.startsWith(pattern.slice(0, -1))
    : url === pattern;
};

export interface ChromeFixtures {
  tabs?: Partial<chrome.tabs.Tab>[];
  windows?: Partial<chrome.windows.Window>[];
  groups?: Partial<chrome.tabGroups.TabGroup>[];
  /** What `chrome.tabs.getCurrent()` resolves to — undefined outside a tab. */
  currentTab?: Partial<chrome.tabs.Tab>;
}

export const createChromeStub = (fixtures: ChromeFixtures = {}) => {
  const tabs = (fixtures.tabs ?? []) as chrome.tabs.Tab[];
  const windows = (fixtures.windows ?? []) as chrome.windows.Window[];
  const groups = (fixtures.groups ?? []) as chrome.tabGroups.TabGroup[];

  return {
    runtime: {
      getURL: vi.fn(
        (path: string) => `${EXTENSION_ORIGIN}${path.replace(/^\//, "")}`,
      ),
      id: EXTENSION_ID,
    },
    tabs: {
      query: vi.fn(async (info: chrome.tabs.QueryInfo = {}) =>
        tabs.filter(
          (tab) =>
            (typeof info.url !== "string" ||
              matchesPattern(info.url, tab.url)) &&
            (info.windowId === undefined || tab.windowId === info.windowId) &&
            (info.active === undefined || Boolean(tab.active) === info.active),
        ),
      ),
      getCurrent: vi.fn(async () => fixtures.currentTab),
      update: vi.fn(async () => undefined),
      create: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      move: vi.fn(async () => undefined),
      group: vi.fn(async () => 1),
      duplicate: vi.fn(async () => undefined),
      reload: vi.fn(async () => undefined),
      onUpdated: event(),
      onActivated: event(),
      onRemoved: event(),
      onMoved: event(),
      onDetached: event(),
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      query: vi.fn(async () => groups),
      update: vi.fn(async () => undefined),
      onUpdated: event(),
    },
    windows: {
      WINDOW_ID_NONE: -1,
      getAll: vi.fn(async () => windows),
      getCurrent: vi.fn(async () => windows[0]),
      getLastFocused: vi.fn(async () => windows[0]),
      get: vi.fn(async (id: number) => windows.find((w) => w.id === id)),
      update: vi.fn(async () => undefined),
      create: vi.fn(async () => ({ id: 99 })),
      remove: vi.fn(async () => undefined),
      onRemoved: event(),
      onCreated: event(),
      onFocusChanged: event(),
    },
    sidePanel: {
      open: vi.fn(async () => undefined),
      setPanelBehavior: vi.fn(async () => undefined),
    },
    sessions: {
      MAX_SESSION_RESULTS: 25,
      getRecentlyClosed: vi.fn(async () => []),
      restore: vi.fn(async () => undefined),
    },
  };
};

export type ChromeStub = ReturnType<typeof createChromeStub>;

/** Install a stub as the global `chrome` and hand it back for assertions. */
export const installChrome = (fixtures: ChromeFixtures = {}): ChromeStub => {
  const stub = createChromeStub(fixtures);
  (globalThis as unknown as { chrome: unknown }).chrome = stub;
  return stub;
};

/** An extension page URL, for building tab fixtures. */
export const extensionUrl = (path = "index.html") =>
  `${EXTENSION_ORIGIN}${path}`;

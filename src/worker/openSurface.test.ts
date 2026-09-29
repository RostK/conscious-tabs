import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ChromeStub,
  extensionUrl,
  installChrome,
} from "../test/chromeStub.ts";

/**
 * The handler is not exported from the worker — it is registered there — so
 * every test here loads the module the way T-1 established and takes the
 * listener back out of the registration. Anything else would be testing a
 * function the browser never calls.
 */
const loadWorker = async (fixtures = {}) => {
  vi.resetModules();
  const chrome: ChromeStub = installChrome(fixtures);
  await import("./index.ts");
  const [handler] = chrome.commands.onCommand.addListener.mock.calls[0] as [
    (command: string, tab?: chrome.tabs.Tab) => void,
  ];
  // The module captured the extension origin at import, and `setPanelBehavior`
  // has already run. Clearing here means every call counted below belongs to
  // the command, which is what the ordering assertion needs.
  vi.clearAllMocks();
  return { chrome, handler };
};

const webTab = (over: Partial<chrome.tabs.Tab> = {}) =>
  ({
    id: 3,
    windowId: 1,
    url: "https://example.com/",
    ...over,
  }) as chrome.tabs.Tab;

/** Every `vi.fn()` the stub exposes, flattened, so nothing escapes the sweep. */
const allMocks = (chrome: ChromeStub) =>
  Object.values(chrome as unknown as Record<string, Record<string, unknown>>)
    .flatMap((api) => Object.values(api))
    .filter(
      (value): value is ReturnType<typeof vi.fn> =>
        typeof value === "function" && "mock" in value,
    );

describe("the keyboard command", () => {
  // AC-2. The ordinary case, and the whole point of the feature.
  it("opens the side panel in the window the key was pressed in", async () => {
    const { chrome, handler } = await loadWorker();

    handler("open-conscious-tabs", webTab({ windowId: 42 }));

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 42 });
  });

  /**
   * AC-36, the criterion that fails silently.
   *
   * A `sidePanel.open()` reached after an await has lost the user activation
   * Chrome requires, and the only symptom is that the key does nothing. This
   * asserts what that actually means: of everything the handler does, the open
   * goes first. Not "is the first statement" — a synchronous comparison is a
   * statement and AC-39 needs one — but nothing that could spend the gesture
   * runs before it.
   */
  it("opens the panel before it does anything else at all", async () => {
    const { chrome, handler } = await loadWorker();

    handler("open-conscious-tabs", webTab());

    const openedAt = chrome.sidePanel.open.mock.invocationCallOrder[0];
    expect(openedAt).toBeDefined();
    const earlier = allMocks(chrome)
      .filter((mock) => mock !== chrome.sidePanel.open)
      .flatMap((mock) => mock.mock.invocationCallOrder)
      .filter((order) => order < openedAt);
    expect(earlier).toEqual([]);
  });

  /**
   * The static half of AC-36. Crude on purpose: the assertion above only sees
   * calls the stub happens to mock, so the day someone adds a lookup through
   * an API with no stub, this is what fails instead of nothing.
   *
   * It checks for `await`, `.then` and `sendMessage` and deliberately **not**
   * for `chrome.` — the handler's earlier branches call `chrome.windows.update`
   * and then return, so that call precedes the open in the text and cannot
   * precede it on any path that reaches the open. Reading source with a regex
   * cannot tell those apart; the behavioural test above can, because it only
   * sees what actually ran. Between them: this one catches a suspended
   * continuation anywhere in the function, that one catches anything at all
   * that ran first.
   */
  it("has no await or message round trip before the open", () => {
    const source = readFileSync(
      join(process.cwd(), "src/worker/openSurface.ts"),
      "utf8",
    );
    const body = source.slice(source.indexOf("export const handleCommand"));
    const upToOpen = body.slice(0, body.indexOf("chrome.sidePanel.open"));

    expect(upToOpen).not.toMatch(/\bawait\b/);
    expect(upToOpen).not.toMatch(/\.then\(/);
    expect(upToOpen).not.toMatch(/sendMessage/);
  });

  // AC-39. Already looking at the manager: bring its window forward, and do
  // not stack a second copy of the UI beside the one in use.
  it("does not open a panel over the extension's own page", async () => {
    const { chrome, handler } = await loadWorker();

    handler(
      "open-conscious-tabs",
      webTab({ windowId: 5, url: extensionUrl("index.html?host=anchor") }),
    );

    expect(chrome.sidePanel.open).not.toHaveBeenCalled();
    expect(chrome.windows.update).toHaveBeenCalledWith(5, { focused: true });
  });

  // E-3. The types promise a tab; nothing promises a window id for every state
  // the browser can be in, and a panel has nowhere to go without one.
  it("falls back to the anchor tab when there is no window", async () => {
    const { chrome, handler } = await loadWorker({ tabs: [] });

    handler("open-conscious-tabs", undefined);
    await vi.waitFor(() => expect(chrome.tabs.create).toHaveBeenCalled());

    expect(chrome.sidePanel.open).not.toHaveBeenCalled();
  });

  // AC-8. The research says the command carries activation; if it turns out
  // not to on some build, this is what keeps the key from doing nothing.
  it("falls back to the anchor tab when the panel refuses to open", async () => {
    const { chrome, handler } = await loadWorker({ tabs: [] });
    chrome.sidePanel.open.mockRejectedValueOnce(new Error("no activation"));

    handler("open-conscious-tabs", webTab());
    await vi.waitFor(() => expect(chrome.tabs.create).toHaveBeenCalled());
  });

  // AC-34. One command today; this is what stops a second one inheriting this
  // behaviour by default rather than by decision.
  it("ignores a command that is not ours", async () => {
    const { chrome, handler } = await loadWorker();

    handler("some-other-command", webTab());

    expect(chrome.sidePanel.open).not.toHaveBeenCalled();
    expect(chrome.windows.update).not.toHaveBeenCalled();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  /**
   * AC-10. An assertion about absence, so what makes it true is written down:
   * the handler's entire call graph is `sidePanel.open`, `windows.update`, and
   * `openAnchorTab`'s query / update / create. Nothing in it closes, mutes,
   * moves or groups anything. The day one of these becomes legitimate, this
   * test stops meaning what it means now — change it deliberately or not at
   * all.
   */
  it("never touches a user's tabs", async () => {
    const { chrome, handler } = await loadWorker();

    handler("open-conscious-tabs", webTab());
    handler("open-conscious-tabs", undefined);
    handler(
      "open-conscious-tabs",
      webTab({ url: extensionUrl("index.html") }),
    );
    await vi.waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());

    expect(chrome.tabs.remove).not.toHaveBeenCalled();
    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
    expect(chrome.windows.remove).not.toHaveBeenCalled();
  });

  /**
   * AC-3, the half a test can carry. Chrome exposes no way to ask whether the
   * panel is open, so "left intact" is verified as: every press asks for the
   * same thing, and nothing on this path can close or replace a surface. That
   * the browser leaves an open panel alone is the manual sweep's job.
   */
  it("asks for the same thing on every repeat press", async () => {
    const { chrome, handler } = await loadWorker();

    handler("open-conscious-tabs", webTab({ windowId: 8 }));
    handler("open-conscious-tabs", webTab({ windowId: 8 }));
    handler("open-conscious-tabs", webTab({ windowId: 8 }));

    expect(chrome.sidePanel.open.mock.calls).toEqual([
      [{ windowId: 8 }],
      [{ windowId: 8 }],
      [{ windowId: 8 }],
    ]);
  });
});

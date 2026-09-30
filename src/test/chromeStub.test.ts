import { describe, expect, it } from "vitest";

import { EXTENSION_ORIGIN, extensionUrl, installChrome } from "./chromeStub.ts";

/**
 * The stub has logic of its own — chiefly the match-pattern filter — and every
 * other test in the repo trusts it. A stub that quietly matches the wrong tabs
 * would make a broken find-or-create look correct.
 */
describe("chrome stub", () => {
  it("builds extension-origin URLs", () => {
    const chrome = installChrome();
    expect(chrome.runtime.getURL("index.html")).toBe(
      `${EXTENSION_ORIGIN}index.html`,
    );
    expect(chrome.runtime.getURL("/index.html")).toBe(
      `${EXTENSION_ORIGIN}index.html`,
    );
  });

  it("returns every tab when the query names no url", async () => {
    const chrome = installChrome({
      tabs: [{ id: 1, url: "https://example.com/" }, { id: 2 }],
    });
    expect(await chrome.tabs.query({})).toHaveLength(2);
  });

  it("filters by a trailing-wildcard pattern", async () => {
    const chrome = installChrome({
      tabs: [
        { id: 1, url: "https://example.com/" },
        { id: 2, url: extensionUrl("index.html") },
      ],
    });
    const found = await chrome.tabs.query({
      url: `${EXTENSION_ORIGIN}*`,
    });
    expect(found.map((t) => t.id)).toEqual([2]);
  });

  // The behaviour AC-13 rests on: Chrome matches a pattern's path against path
  // *plus query*, so `<origin>/*` has to find `index.html?host=anchor`.
  it("matches a url carrying a query string", async () => {
    const chrome = installChrome({
      tabs: [{ id: 3, url: extensionUrl("index.html?host=anchor") }],
    });
    const found = await chrome.tabs.query({ url: `${EXTENSION_ORIGIN}*` });
    expect(found.map((t) => t.id)).toEqual([3]);
  });

  it("never matches a tab with no url", async () => {
    const chrome = installChrome({ tabs: [{ id: 4 }] });
    expect(await chrome.tabs.query({ url: `${EXTENSION_ORIGIN}*` })).toEqual(
      [],
    );
  });

  // Defaulting to "not in a tab" is what makes the side-panel case the one a
  // test has to opt out of, rather than the one it can forget to set up.
  it("reports no current tab unless a fixture supplies one", async () => {
    expect(await installChrome().tabs.getCurrent()).toBeUndefined();
    const inTab = installChrome({ currentTab: { id: 9 } });
    expect((await inTab.tabs.getCurrent())?.id).toBe(9);
  });

  /**
   * A keyboard command arrives as an event fired at a listener the worker
   * registered at import — there is no call to make and nothing exported. So
   * the stub has to be able to fire it, or none of that path is reachable from
   * a test at all.
   */
  it("delivers a fired command to its listener", () => {
    const chrome = installChrome();
    const heard: unknown[][] = [];
    chrome.commands.onCommand.addListener(((...args: unknown[]) => {
      heard.push(args);
    }) as never);

    chrome.commands.onCommand.fire(
      ...([
        "open-conscious-tabs",
        { id: 7, windowId: 1, url: "https://example.com/" },
      ] as never[]),
    );

    expect(heard).toHaveLength(1);
    // Both arguments, because the second is the whole reason the design works:
    // Chrome hands the listener the active tab, so the window id needs no
    // lookup and nothing has to be awaited before the panel is opened.
    expect(heard[0][0]).toBe("open-conscious-tabs");
    expect((heard[0][1] as chrome.tabs.Tab).windowId).toBe(1);
  });

  // One bound command is the ordinary state, so it is the default; the
  // interesting case is the one a test opts into.
  it("reports one bound command unless told otherwise", async () => {
    expect(await installChrome().commands.getAll()).toEqual([
      {
        name: "open-conscious-tabs",
        description: "Open Conscious Tabs",
        shortcut: "Ctrl+Shift+K",
      },
    ]);

    const unbound = installChrome({ commands: [{ shortcut: "" }] });
    expect((await unbound.commands.getAll())[0].shortcut).toBe("");
  });

  /**
   * The stub clones what it hands out, on purpose and everywhere — `chrome.*`
   * answers cross a process boundary, so every call returns fresh objects.
   * Handing out a live reference lets one test's mutation look like state the
   * stub always had, which is how change detection silently stops working.
   */
  it("hands out a fresh copy of the commands each call", async () => {
    const chrome = installChrome();

    const first = await chrome.commands.getAll();
    first[0].shortcut = "Ctrl+Shift+Z";

    expect((await chrome.commands.getAll())[0].shortcut).toBe("Ctrl+Shift+K");
  });
});

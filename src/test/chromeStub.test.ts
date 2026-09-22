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
});

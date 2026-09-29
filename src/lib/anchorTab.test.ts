import { describe, expect, it } from "vitest";

import { ChromeStub, extensionUrl, installChrome } from "../test/chromeStub.ts";
import { openAnchorTab } from "./anchorTab.ts";

const ANCHOR = extensionUrl("index.html?host=anchor");
const BARE = extensionUrl("index.html");

/*
 * Moved here verbatim when the find-or-create half of `anchor.ts` was split
 * out so the service worker could reach it. Unchanged apart from this header:
 * if one of these had needed editing, the move would have changed behaviour,
 * which is the one thing it must not do.
 */

describe("openAnchorTab", () => {
  // AC-13: focus an existing anchor tab, create one only if none exists —
  // never a second.
  it("creates the anchor tab when none exists", async () => {
    const chrome: ChromeStub = installChrome({ tabs: [] });

    await openAnchorTab();

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: ANCHOR,
      active: true,
    });
  });

  it("focuses an existing anchor tab instead of creating another", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [{ id: 7, windowId: 3, url: ANCHOR }],
    });

    await openAnchorTab();

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).toHaveBeenCalledWith(7, { active: true });
    expect(chrome.windows.update).toHaveBeenCalledWith(3, { focused: true });
  });

  // E-16: invoked from a window that is not the anchor's, it brings the
  // anchor's window forward rather than making a local copy.
  it("focuses the anchor's window, not just the tab", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [{ id: 7, windowId: 42, url: ANCHOR }],
    });

    await openAnchorTab();

    expect(chrome.windows.update).toHaveBeenCalledWith(42, { focused: true });
  });

  /**
   * The anchor tab is the document holding the float, so mistaking it for a
   * stale extension page means navigating it — and the float dies with the
   * document. A fragment on the URL was enough to cause that.
   */
  it("recognises an anchor tab carrying a fragment, and leaves it alone", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [{ id: 7, windowId: 3, url: `${ANCHOR}#section` }],
    });

    await openAnchorTab();

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).toHaveBeenCalledWith(7, { active: true });
    expect(chrome.tabs.update).not.toHaveBeenCalledWith(7, {
      active: true,
      url: ANCHOR,
    });
  });

  it("still upgrades a bare extension page carrying a fragment", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [{ id: 9, windowId: 3, url: `${BARE}#section` }],
    });

    await openAnchorTab();

    expect(chrome.tabs.update).toHaveBeenCalledWith(9, {
      active: true,
      url: ANCHOR,
    });
  });

  // D-5b: a bare extension page left over from before this feature would also
  // offer a float control, and Chrome allows one Picture-in-Picture window per
  // browser — so a second float would evict the first.
  it("prefers a real anchor tab over a bare extension page", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [
        { id: 1, windowId: 3, url: BARE },
        { id: 2, windowId: 3, url: ANCHOR },
      ],
    });

    await openAnchorTab();

    expect(chrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
  });

  it("upgrades a bare extension page to an anchor when it is all there is", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [{ id: 1, windowId: 3, url: BARE }],
    });

    await openAnchorTab();

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).toHaveBeenCalledWith(1, {
      active: true,
      url: ANCHOR,
    });
  });

  it("ignores tabs that are not this extension's pages", async () => {
    const chrome: ChromeStub = installChrome({
      tabs: [{ id: 1, windowId: 3, url: "https://example.com/" }],
    });

    await openAnchorTab();

    // The query is by match pattern, so a web tab must never be mistaken for
    // an anchor and navigated away from.
    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalled();
  });
});

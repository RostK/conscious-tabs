import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChromeStub,
  extensionUrl,
  installChrome,
} from "../test/chromeStub.ts";
import { closeIfSidePanel, openAnchorTab } from "./anchor.ts";

const ANCHOR = extensionUrl("index.html?host=anchor");
const BARE = extensionUrl("index.html");

const atHost = (search: string) =>
  window.history.replaceState(null, "", search);

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

describe("closeIfSidePanel", () => {
  let close: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    close = vi.spyOn(window, "close").mockImplementation(() => undefined);
  });

  // AC-3 — the panel hands off rather than leaving a second copy behind.
  it("closes the document when it really is the side panel", async () => {
    atHost("/");
    installChrome({ currentTab: undefined });

    await closeIfSidePanel();

    expect(close).toHaveBeenCalled();
  });

  // D-5a: an extension page in a plain tab also reports host "panel", because
  // it has no ?host= either. Closing on that alone shuts a real browser tab.
  it("does NOT close an extension page that is running in a tab", async () => {
    atHost("/");
    installChrome({ currentTab: { id: 5, windowId: 3, url: BARE } });

    await closeIfSidePanel();

    expect(close).not.toHaveBeenCalled();
  });

  // D-5a, the other half: tabs.getCurrent() is also undefined inside the
  // float's iframe, so the undefined check alone would close the float.
  it("does NOT close the float, where getCurrent() is also undefined", async () => {
    atHost("/?host=float");
    installChrome({ currentTab: undefined });

    await closeIfSidePanel();

    expect(close).not.toHaveBeenCalled();
  });

  it("does NOT close the anchor tab", async () => {
    atHost("/?host=anchor");
    installChrome({ currentTab: { id: 7, windowId: 3, url: ANCHOR } });

    await closeIfSidePanel();

    expect(close).not.toHaveBeenCalled();
  });
});

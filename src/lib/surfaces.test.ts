import { beforeEach, describe, expect, it } from "vitest";

import {
  ChromeStub,
  extensionUrl,
  installChrome,
} from "../test/chromeStub.ts";
import {
  bringPanelAlong,
  isOwnPage,
  resolveUserWindow,
} from "./surfaces.ts";

let chrome: ChromeStub;

const atHost = (search: string) => {
  window.history.replaceState(null, "", search);
};

beforeEach(() => {
  chrome = installChrome();
});

/**
 * AC-15. The failure this guards is not a stray side panel — it is that
 * `sidePanel.open()` was the first await in six sequences, so when it rejected
 * outside the panel, the tab activation after it never ran.
 */
describe("bringPanelAlong", () => {
  it("opens the side panel when the user is in the side panel", async () => {
    atHost("/");
    await bringPanelAlong(7);
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 7 });
  });

  it("does nothing in the anchor tab", async () => {
    atHost("/?host=anchor");
    await bringPanelAlong(7);
    expect(chrome.sidePanel.open).not.toHaveBeenCalled();
  });

  it("does nothing in the float", async () => {
    atHost("/?host=float");
    await bringPanelAlong(7);
    expect(chrome.sidePanel.open).not.toHaveBeenCalled();
  });

  // It may already be open, or a caller may have spent the gesture. Neither is
  // worth failing the surrounding action over — that was the original bug.
  it("resolves even when the panel refuses to open", async () => {
    atHost("/");
    chrome.sidePanel.open.mockRejectedValue(new Error("no user gesture"));
    await expect(bringPanelAlong(7)).resolves.toBeUndefined();
  });
});

/**
 * The anchor tab is the one holding the float, and chrome.tabs.query is
 * unfiltered by default — so without this the manager listed the tab whose
 * closure kills the float, with a close button on it.
 */
describe("isOwnPage", () => {
  it("recognises this extension's pages", () => {
    expect(isOwnPage(extensionUrl("index.html"))).toBe(true);
    expect(isOwnPage(extensionUrl("index.html?host=anchor"))).toBe(true);
    expect(isOwnPage(extensionUrl("index.html?host=float"))).toBe(true);
  });

  it("leaves ordinary tabs alone", () => {
    expect(isOwnPage("https://example.com/")).toBe(false);
    expect(isOwnPage("chrome://extensions/")).toBe(false);
    expect(isOwnPage("about:blank")).toBe(false);
  });

  // A different extension's page is not ours to hide.
  it("does not match another extension's pages", () => {
    expect(isOwnPage("chrome-extension://someotherextensionid/index.html")).toBe(
      false,
    );
  });

  it("is false for a tab with no url", () => {
    expect(isOwnPage(undefined)).toBe(false);
    expect(isOwnPage("")).toBe(false);
  });
});

/**
 * AC-17. The defect this replaces was `chrome.windows.getCurrent()`, which is
 * right for a side panel and wrong for every surface that belongs to no
 * window: in the float it returned the extension's own window, so the
 * current-tab card described our page instead of the user's.
 */
describe("resolveUserWindow", () => {
  const userWindows = [{ id: 1 }, { id: 2 }];
  const browsing = [
    { id: 10, windowId: 1, active: true, url: "https://example.com/" },
    { id: 11, windowId: 2, active: true, url: "https://other.test/" },
  ];

  it("uses the panel's own window in the side panel", async () => {
    atHost("/");
    installChrome({ windows: [{ id: 5 }], tabs: browsing });
    expect(await resolveUserWindow()).toBe(5);
  });

  it("follows the last-focused window from the anchor tab", async () => {
    atHost("/?host=anchor");
    const stub = installChrome({ windows: userWindows, tabs: browsing });
    stub.windows.getLastFocused.mockResolvedValue({
      id: 2,
    } as chrome.windows.Window);
    expect(await resolveUserWindow()).toBe(2);
  });

  it("follows the last-focused window from the float", async () => {
    atHost("/?host=float");
    const stub = installChrome({ windows: userWindows, tabs: browsing });
    stub.windows.getLastFocused.mockResolvedValue({
      id: 1,
    } as chrome.windows.Window);
    expect(await resolveUserWindow()).toBe(1);
  });

  // The heart of AC-17: never present the extension's own tab as the user's.
  it("skips a window whose active tab is one of ours", async () => {
    atHost("/?host=float");
    const stub = installChrome({
      windows: [{ id: 3 }, { id: 1 }],
      tabs: [
        { id: 30, windowId: 3, active: true, url: extensionUrl("index.html?host=anchor") },
        ...browsing,
      ],
    });
    // The anchor's window was focused most recently — it is where the user
    // clicked "Float on top".
    stub.windows.getLastFocused.mockResolvedValue({
      id: 3,
    } as chrome.windows.Window);

    expect(await resolveUserWindow()).toBe(1);
  });

  it("gives up rather than guessing when every window is ours", async () => {
    atHost("/?host=float");
    const stub = installChrome({
      windows: [{ id: 3 }],
      tabs: [
        { id: 30, windowId: 3, active: true, url: extensionUrl("index.html?host=anchor") },
      ],
    });
    stub.windows.getLastFocused.mockResolvedValue({
      id: 3,
    } as chrome.windows.Window);

    expect(await resolveUserWindow()).toBeUndefined();
  });

  it("asks only for normal windows, so a picture-in-picture is never a candidate", async () => {
    atHost("/?host=float");
    const stub = installChrome({ windows: userWindows, tabs: browsing });
    stub.windows.getLastFocused.mockResolvedValue({
      id: 1,
    } as chrome.windows.Window);

    await resolveUserWindow();

    expect(stub.windows.getLastFocused).toHaveBeenCalledWith({
      windowTypes: ["normal"],
    });
  });
});

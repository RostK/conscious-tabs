import { beforeEach, describe, expect, it } from "vitest";

import {
  ChromeStub,
  extensionUrl,
  installChrome,
} from "../test/chromeStub.ts";
import { bringPanelAlong, isOwnPage } from "./surfaces.ts";

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

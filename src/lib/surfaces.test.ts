import { beforeEach, describe, expect, it } from "vitest";

import { ChromeStub, installChrome } from "../test/chromeStub.ts";
import { bringPanelAlong } from "./surfaces.ts";

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

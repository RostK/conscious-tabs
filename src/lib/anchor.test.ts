import { beforeEach, describe, expect, it, vi } from "vitest";

import { extensionUrl, installChrome } from "../test/chromeStub.ts";
import { closeIfSidePanel } from "./anchor.ts";

const ANCHOR = extensionUrl("index.html?host=anchor");
const BARE = extensionUrl("index.html");

const atHost = (search: string) =>
  window.history.replaceState(null, "", search);

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

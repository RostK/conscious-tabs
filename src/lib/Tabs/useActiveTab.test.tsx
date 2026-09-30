import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { extensionUrl, installChrome } from "../../test/chromeStub.ts";
import { useActiveTab } from "./useActiveTab.ts";

const atHost = (search: string) => {
  window.history.replaceState(null, "", search);
};

beforeEach(() => {
  atHost("/");
});

/**
 * The current-tab card's subject, outside the side panel. Both cases were
 * reported or found on 2026-09-30, and both are the same shape: the user acts
 * inside one window, no *window* event fires, and the card goes on describing
 * a window they are not in — or nothing at all.
 */
describe("useActiveTab in the float and the anchor tab", () => {
  it("follows a tab just opened from a link", async () => {
    atHost("/?host=float");
    const tabs: Partial<chrome.tabs.Tab>[] = [
      { id: 10, windowId: 1, active: true, url: "https://example.com/" },
    ];
    const chrome = installChrome({ windows: [{ id: 1 }], tabs });
    chrome.windows.getLastFocused.mockResolvedValue({
      id: 1,
    } as chrome.windows.Window);

    const { result } = renderHook(() => useActiveTab());
    await waitFor(() => expect(result.current?.id).toBe(10));

    // A link opens a new tab, which becomes active before its first navigation
    // commits: no `url` yet, only `pendingUrl`. Focus lands in the window at
    // the same moment.
    tabs[0].active = false;
    tabs.push({
      id: 12,
      windowId: 1,
      active: true,
      url: "",
      pendingUrl: "https://example.com/next",
    });
    chrome.tabs.onCreated.fire();
    chrome.tabs.onActivated.fire();
    chrome.windows.onFocusChanged.fire();

    await waitFor(() => expect(result.current?.id).toBe(12));
  });

  it("follows a switch away from the anchor tab within its own window", async () => {
    atHost("/?host=anchor");
    const tabs: Partial<chrome.tabs.Tab>[] = [
      {
        id: 30,
        windowId: 1,
        active: true,
        url: extensionUrl("index.html?host=anchor"),
      },
      { id: 31, windowId: 1, active: false, url: "https://a.test/" },
      { id: 20, windowId: 2, active: true, url: "https://b.test/" },
    ];
    const chrome = installChrome({ windows: [{ id: 1 }, { id: 2 }], tabs });
    chrome.windows.getLastFocused.mockResolvedValue({
      id: 1,
    } as chrome.windows.Window);

    const { result } = renderHook(() => useActiveTab());
    // Window 1's active tab is ours, so the card describes window 2 (AC-17).
    await waitFor(() => expect(result.current?.id).toBe(20));

    // The user clicks another tab in the anchor's own window. The window keeps
    // focus, so no window event fires — only a tab one.
    tabs[0].active = false;
    tabs[1].active = true;
    chrome.tabs.onActivated.fire();

    await waitFor(() => expect(result.current?.id).toBe(31));
  });
});

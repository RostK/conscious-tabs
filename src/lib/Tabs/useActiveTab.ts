import { useMemo } from "react";

import { TabItem } from "./types.ts";
import { useTabsStructure } from "./useTabsStructure.ts";
import { useUserWindow } from "./useUserWindow.ts";

/**
 * The active tab of the window the user is working in.
 *
 * This used to resolve the window once via `chrome.windows.getCurrent()`,
 * which is correct for a side panel and wrong everywhere else: in the anchor
 * tab and the float it returns the *extension's* window, so the card ended up
 * describing our own page instead of whatever the user was reading.
 *
 * The active tab then follows reactively as the user switches tabs, because
 * `useTabsStructure` already listens to `chrome.tabs.onActivated`/`onUpdated`
 * — when the active flag moves, this re-derives.
 */
export const useActiveTab = (): TabItem | undefined => {
  const hostWindowId = useUserWindow();
  const tabsStructure = useTabsStructure();

  return useMemo(() => {
    const flatTabs = (tabsStructure ?? []).flatMap((item) =>
      item.type === "group" ? item.tabs : [item],
    );
    return flatTabs.find((tab) => tab.active && tab.windowId === hostWindowId);
  }, [tabsStructure, hostWindowId]);
};

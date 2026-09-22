import { useMemo } from "react";

import { TabItem } from "./types.ts";
import { useTabsStructure } from "./useTabsStructure.ts";
import { useUserWindow } from "./useUserWindow.ts";

/**
 * Tabs that are currently producing sound or are muted, across all windows —
 * excluding the active tab of the window the user is in, which the current-tab
 * panel already covers. Reactive via useTabsStructure (chrome.tabs events).
 *
 * Shared the same `chrome.windows.getCurrent()` defect as useActiveTab: from
 * the float it excluded the active tab of the *extension's* window, so the
 * user's own noisy tab stayed in the list and the exclusion did nothing.
 */
export const useAudioTabs = (): TabItem[] => {
  const tabsStructure = useTabsStructure();
  const hostWindowId = useUserWindow();

  return useMemo(() => {
    const flatTabs = tabsStructure.flatMap((item) =>
      item.type === "group" ? item.tabs : [item],
    );
    return flatTabs.filter(
      (tab) =>
        (tab.audible || tab.mutedInfo?.muted) &&
        !(tab.active && tab.windowId === hostWindowId),
    );
  }, [tabsStructure, hostWindowId]);
};

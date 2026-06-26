import { useEffect, useMemo, useState } from "react";

import { TabItem } from "./types.ts";
import { useTabsStructure } from "./useTabsStructure.ts";

/**
 * The active tab of the window this side-panel instance belongs to.
 *
 * The host window is resolved once via `chrome.windows.getCurrent()` (each
 * side-panel document belongs to one window). The active tab then follows
 * reactively as the user switches tabs, because `useTabsStructure` already
 * listens to `chrome.tabs.onActivated`/`onUpdated`/... — when the active flag
 * moves, this re-derives.
 */
export const useActiveTab = (): TabItem | undefined => {
  const [hostWindowId, setHostWindowId] = useState<number>();

  useEffect(() => {
    void chrome.windows.getCurrent().then((window) => {
      setHostWindowId(window.id);
    });
  }, []);

  const tabsStructure = useTabsStructure();

  return useMemo(() => {
    const flatTabs = tabsStructure.flatMap((item) =>
      item.type === "group" ? item.tabs : [item],
    );
    return flatTabs.find((tab) => tab.active && tab.windowId === hostWindowId);
  }, [tabsStructure, hostWindowId]);
};

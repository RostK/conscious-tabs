import { useEffect, useMemo, useState } from "react";

import { TabItem } from "./types.ts";
import { useTabsStructure } from "./useTabsStructure.ts";

/**
 * Tabs that are currently producing sound or are muted, across all windows —
 * excluding this window's active tab, which the current-tab panel already
 * covers. Reactive via useTabsStructure (listens to chrome.tabs events).
 */
export const useAudioTabs = (): TabItem[] => {
  const tabsStructure = useTabsStructure();
  const [hostWindowId, setHostWindowId] = useState<number>();

  useEffect(() => {
    void chrome.windows.getCurrent().then((window) => {
      setHostWindowId(window.id);
    });
  }, []);

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

import { useMemo } from "react";

import { TabItem } from "./types.ts";
import { useTabsStructure } from "./useTabsStructure.ts";

/**
 * Every tab making sound or muted, across all windows. Reactive via
 * useTabsStructure (chrome.tabs events).
 *
 * This used to exclude the active tab of the user's window, on the grounds
 * that the current-tab card already covered it. The cost was that the toolbar
 * speaker vanished at the moment it mattered: when the noisy tab was the one
 * you were looking at, the control named "tabs playing sound" hid itself, and
 * only came back once you switched away. It also made "Mute all" quietly mean
 * "mute all but this one", and left the badge counting something no label
 * explained.
 *
 * The duplication that exclusion avoided is the cheaper cost: the card and the
 * tab's own row both carry a mute of their own, and both name the tab they act
 * on.
 *
 * Dropping it also removed this hook's dependency on useUserWindow, which only
 * the exclusion needed — and which it had already got wrong once: resolved
 * from the float it named the extension's own window, so the exclusion
 * silently did nothing there.
 */
export const useAudioTabs = (): TabItem[] => {
  const tabsStructure = useTabsStructure();

  return useMemo(() => {
    const flatTabs = tabsStructure.flatMap((item) =>
      item.type === "group" ? item.tabs : [item],
    );
    return flatTabs.filter((tab) => tab.audible || tab.mutedInfo?.muted);
  }, [tabsStructure]);
};

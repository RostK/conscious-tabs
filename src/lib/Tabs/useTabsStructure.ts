import { useMemo } from "react";

import { createBrowserStore, sameData } from "../browserStore.ts";
import { browsingWindowIds, isOwnPage } from "../surfaces.ts";
import { GroupItem, TabItem, TabsStructure } from "./types.ts";

import TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE;

const getTabsTree = (
  tabs: chrome.tabs.Tab[],
  groups: chrome.tabGroups.TabGroup[],
  filter?: (item: chrome.tabs.Tab) => boolean,
): TabsStructure => {
  const structure = new Map<string, TabItem | GroupItem>();
  tabs
    .filter((tab) => (filter ? filter(tab) : true))
    .sort((a, b) => a.index - b.index)
    .forEach((tab) => {
      const {
        id,
        title,
        url,
        index,
        windowId,
        groupId,
        favIconUrl,
        active,
        highlighted,
        pinned,
        audible,
        mutedInfo,
      } = tab;
      const tabItem: TabItem = {
        type: "tab",
        id,
        title,
        url,
        index,
        windowId,
        groupId,
        favIconUrl,
        active,
        highlighted,
        pinned,
        audible,
        mutedInfo,
      };
      if (groupId === TAB_GROUP_ID_NONE) {
        // Tab not in a group
        structure.set(`tab:${id}`, tabItem);
        return;
      }
      // Tab in a group
      const groupItem = structure.get(`group:${groupId}`) as GroupItem;
      if (groupItem) {
        // Group already structured
        structure.set(`group:${groupId}`, {
          ...groupItem,
          tabs: [...groupItem.tabs, tabItem],
        });
        return;
      }
      // First tab in a group
      const groupData = groups.find(({ id }) => id === groupId);
      if (!groupData) {
        // Tab is absent somehow
        structure.set(`tab:${id}`, tabItem);
        return;
      }
      // Create new group in structure
      structure.set(`group:${groupId}`, {
        ...groupData,
        type: "group",
        tabs: [tabItem],
      });
    });
  return [...structure.values()];
};

/**
 * The tab list, as one store the whole app subscribes to.
 *
 * The rules that make this safe — ordering, not-yet-loaded, failed reads,
 * listener lifetime — live in createBrowserStore, which two other pieces of
 * browser state now use as well.
 */
type Snapshot = {
  tabs: chrome.tabs.Tab[];
  groups: chrome.tabGroups.TabGroup[];
};

const store = createBrowserStore<Snapshot>({
  label: "the browser's tabs",
  equals: sameData,
  events: () => [
    // onCreated included, though a new tab almost always fires onUpdated a
    // moment later anyway: "almost always" is not the same as always, and a
    // tab the store has not heard of is one the undo prompt will not speak
    // for — see wasListedTab.
    chrome.tabs.onCreated,
    chrome.tabs.onUpdated,
    chrome.tabs.onActivated,
    chrome.tabs.onRemoved,
    chrome.tabs.onMoved,
    // Both halves of a cross-window drag. onDetached fires when the drag
    // starts and onAttached when it lands, which can be seconds later —
    // listening only to the first meant querying a tab still in flight and
    // never hearing where it came down, so the row sat in the wrong window
    // until something unrelated refreshed the list.
    chrome.tabs.onDetached,
    chrome.tabs.onAttached,
    chrome.tabGroups.onUpdated,
  ],
  load: async () => {
    // Two exclusions, both learned the hard way.
    //
    // The float's own window: chrome.tabs has no filter for it, and its
    // `windowType` is "normal" like everything else, so the browsing windows
    // have to be resolved first and the tabs matched against them.
    //
    // Our own pages: the anchor tab is the one holding the float, and
    // chrome.tabs.query is unfiltered by default — so without this the manager
    // listed the tab whose closure kills the float, with a close button on it.
    //
    // Asked together rather than in turn: no answer here depends on another,
    // and this runs on every browser event, so awaiting them one at a time
    // spent three round trips of latency to learn what one costs.
    const [browsing, queried, groups] = await Promise.all([
      browsingWindowIds(),
      chrome.tabs.query({}),
      chrome.tabGroups.query({}),
    ]);
    const tabs = queried.filter(
      ({ url, windowId }) => browsing.has(windowId) && !isOwnPage(url),
    );
    return { tabs, groups };
  },
});

/**
 * Hold the store open for as long as the caller is mounted, without
 * re-rendering when it changes — for readers of `wasListedTab`, which asks a
 * question *about* the snapshot rather than rendering it.
 */
export const useKeepTabsLoaded = store.useAlive;

/**
 * Was this tab one the manager was mirroring?
 *
 * `chrome.tabs.onRemoved` fires for tabs this app never showed and never
 * would: the float's own window holds an `about:blank` tab, so closing the
 * float raised "Tab closed" with an UNDO that offered to restore it. Asked at
 * the moment of the event, while the removed tab is still in the last
 * snapshot and before the refresh it triggers has landed.
 *
 * Unknown before the first load, where the honest answer is yes: better a
 * prompt for a tab we had not catalogued than a lost undo.
 */
export const wasListedTab = (id: number): boolean => {
  const snapshot = store.get();
  return snapshot ? snapshot.tabs.some((tab) => tab.id === id) : true;
};

/**
 * `undefined` until the first query has resolved — not the same thing as an
 * empty browser, which is what an initial `[]` claimed. TabsView drew its
 * "No other tabs are open." from that claim, so the message appeared for as
 * long as the tabs took to arrive.
 */
export const useTabsStructure = (options?: {
  filter?: (item: chrome.tabs.Tab) => boolean;
}): TabsStructure | undefined => {
  const filter = options?.filter;
  const current = store.useValue();

  return useMemo(
    () =>
      current ? getTabsTree(current.tabs, current.groups, filter) : undefined,
    [current, filter],
  );
};

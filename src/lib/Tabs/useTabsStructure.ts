import { debounce } from "@mui/material";
import { useMemo, useSyncExternalStore } from "react";

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
 * One query, however many components ask.
 *
 * This used to be per-component state: five callers, each with its own chrome
 * listeners, its own debounce and its own three-call query. A single
 * `chrome.tabs.onUpdated` cost 12 extension round trips — measured, four of
 * each call — because four copies were mounted at once and every one of them
 * answered the same event independently. The work is identical in all of them,
 * so it belongs in one place that they subscribe to.
 *
 * The snapshot stays raw (tabs and groups as Chrome returned them); each
 * consumer builds its own tree, because `filter` differs between them and
 * building it is pure computation, which is not what was expensive.
 */
type Snapshot = {
  tabs: chrome.tabs.Tab[];
  groups: chrome.tabGroups.TabGroup[];
};

let snapshot: Snapshot | undefined;
const listeners = new Set<() => void>();

/**
 * Answers can arrive out of order.
 *
 * Each load is three awaited round trips, so a load started earlier can finish
 * later than one started after it. Without this, the older answer wins simply
 * by landing last, and the list shows state that has already been superseded —
 * a closed tab back from the dead — until some unrelated event refreshes it.
 */
let generation = 0;

const load = async () => {
  const mine = ++generation;

  // Two exclusions, both learned the hard way.
  //
  // The float's own window: chrome.tabs has no filter for it, and its
  // `windowType` is "normal" like everything else, so the browsing windows
  // have to be resolved first and the tabs matched against them.
  //
  // Our own pages: the anchor tab is the one holding the float, and
  // chrome.tabs.query is unfiltered by default — so without this the manager
  // listed the tab whose closure kills the float, with a close button on it.
  const browsing = await browsingWindowIds();
  const tabs = (await chrome.tabs.query({})).filter(
    ({ url, windowId }) => browsing.has(windowId) && !isOwnPage(url),
  );
  const groups = await chrome.tabGroups.query({});

  if (mine !== generation) return;
  snapshot = { tabs, groups };
  listeners.forEach((notify) => {
    notify();
  });
};

const refresh = debounce(() => {
  void load();
}, 10);

const TAB_EVENTS = () => [
  chrome.tabs.onUpdated,
  chrome.tabs.onActivated,
  chrome.tabs.onRemoved,
  chrome.tabs.onMoved,
  chrome.tabs.onDetached,
  chrome.tabGroups.onUpdated,
];

/**
 * Chrome listeners live exactly as long as someone is subscribed. Dropping to
 * zero also drops the snapshot: the next subscriber is then a cold start
 * rather than a reader of whatever the last one left behind, which matters in
 * tests, where the chrome stub is replaced between cases.
 */
const subscribe = (notify: () => void): (() => void) => {
  if (listeners.size === 0) {
    TAB_EVENTS().forEach((event) => {
      event.addListener(refresh);
    });
  }
  listeners.add(notify);
  refresh();

  return () => {
    listeners.delete(notify);
    if (listeners.size > 0) return;
    TAB_EVENTS().forEach((event) => {
      event.removeListener(refresh);
    });
    refresh.clear();
    generation += 1; // an answer in flight is nobody's now
    snapshot = undefined;
  };
};

const getSnapshot = () => snapshot;

/**
 * Was this tab one the manager was mirroring?
 *
 * `chrome.tabs.onRemoved` fires for tabs this app never showed and never
 * would: the float's own window holds an `about:blank` tab, so closing the
 * float raised "Tab closed" with an UNDO that offered to restore it. The
 * list already knows which tabs it mirrors — this is that knowledge, asked
 * at the moment of the event, while the removed tab is still in the last
 * snapshot and before the refresh it triggers has landed.
 *
 * Unknown before the first load, where the honest answer is yes: better a
 * prompt for a tab we had not catalogued than a lost undo.
 */
export const wasListedTab = (id: number): boolean =>
  snapshot ? snapshot.tabs.some((tab) => tab.id === id) : true;

/**
 * `undefined` until the first query has resolved — not the same thing as an
 * empty browser, which is what an initial `[]` claimed. TabsView drew its
 * "No other tabs are open." from that claim, so the message appeared for as
 * long as the tabs took to arrive: the windows query is one call, this is three
 * plus a debounce, so the gap is real and lands on every open.
 */
export const useTabsStructure: (options?: {
  filter?: (item: chrome.tabs.Tab) => boolean;
}) => TabsStructure | undefined = (options) => {
  const filter = options?.filter;
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () =>
      current ? getTabsTree(current.tabs, current.groups, filter) : undefined,
    [current, filter],
  );
};

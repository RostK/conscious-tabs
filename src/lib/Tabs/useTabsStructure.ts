import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { useUpdateEvents } from "../useUpdateEvents.ts";
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

export const useTabsStructure: (options?: {
  filter?: (item: chrome.tabs.Tab) => boolean;
}) => TabsStructure = (options) => {
  const filter = options?.filter;
  const [tabsStructure, setTabsStructure] = useState<TabsStructure>([]);
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const getTabsFunc = useCallback(async () => {
    const tabs = await chrome.tabs.query({});
    const groups = await chrome.tabGroups.query({});
    setTabs(tabs);
    setGroups(groups);
  }, []);
  const getTabs = useDebouncedCallback(getTabsFunc, 10);

  useEffect(() => {
    getTabs();
  }, [getTabs]);

  const getInitialData = useCallback(async () => {
    void getTabs();
  }, [getTabs]);

  useUpdateEvents({
    init: getInitialData,
    onTabsUpdate: getTabs,
    onGroupsUpdate: getTabs,
  });

  useEffect(() => {
    setTabsStructure(getTabsTree(tabs, groups, filter));
  }, [filter, groups, tabs]);

  return tabsStructure;
};

import { useEffect, useState } from "react";
import "./App.css";
import Tab = chrome.tabs.Tab;
import TabGroup = chrome.tabGroups.TabGroup;
import { Tabs } from "./Tabs";
import TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE;
import { useDebouncedCallback } from "use-debounce";

const getTabsTree = (tabs: Tab[], groups: TabGroup[]): TabsStructure => {
  const structure = new Map<string, TabItem | GroupItem>();
  tabs
    .sort((a, b) => a.index - b.index)
    .forEach(
      ({ id, title, url, index, windowId, groupId, favIconUrl, active }) => {
        if (groupId === TAB_GROUP_ID_NONE) {
          // Tab not in a group
          structure.set(`tab:${id}`, {
            type: "tab",
            id,
            title,
            url,
            index,
            windowId,
            groupId,
            favIconUrl,
            active,
          });
          return;
        }
        const groupItem = structure.get(`group:${groupId}`) as GroupItem;
        // Tab in a group
        if (groupItem) {
          //Group already structured
          structure.set(`group:${groupId}`, {
            ...groupItem,
            tabs: [
              ...groupItem.tabs,
              {
                type: "tab",
                id,
                title,
                url,
                index,
                windowId,
                groupId,
                favIconUrl,
                active,
              },
            ],
          });
          return;
        }
        // First tab in a group
        const groupData = groups.find(({ id }) => id === groupId);
        if (!groupData) {
          // Tab is absent somehow
          structure.set(`tab:${id}`, {
            type: "tab",
            id,
            title,
            url,
            index,
            windowId,
            groupId,
            favIconUrl,
            active,
          });
          return;
        }
        //Create new group in structure
        structure.set(`group:${groupId}`, {
          ...groupData,
          type: "group",
          tabs: [
            {
              type: "tab",
              id,
              title,
              url,
              index,
              windowId,
              groupId,
              favIconUrl,
              active,
            },
          ],
        });
      },
    );
  return [...structure.values()];
};

function App() {
  const [tabsStructure, setTabsStructure] = useState<TabsStructure>([]);
  const getTabsFunc = async () => {
    const tabs = await chrome.tabs.query({});
    const groups = await chrome.tabGroups.query({});
    setTabsStructure(getTabsTree(tabs, groups));
  };
  const getTabs = useDebouncedCallback(getTabsFunc, 200);

  useEffect(() => {
    chrome.tabs.onUpdated.addListener(getTabs);
    chrome.tabs.onActivated.addListener(getTabs);
    chrome.tabs.onRemoved.addListener(getTabs);
    chrome.tabGroups.onUpdated.addListener(getTabs);
    void getTabs();
    return () => {
      chrome.tabs.onUpdated.removeListener(getTabs);
      chrome.tabs.onActivated.removeListener(getTabs);
      chrome.tabs.onRemoved.removeListener(getTabs);
      chrome.tabGroups.onUpdated.removeListener(getTabs);
    };
  }, [getTabs]);
  return (
    <>
      <Tabs tabsStructure={tabsStructure} />
    </>
  );
}

export default App;

import { useEffect } from "react";

export const useUpdateEvents = ({
  onTabsUpdate,
  onGroupsUpdate,
  onWindowsUpdate,
  init,
}: {
  onTabsUpdate?: () => void;
  onGroupsUpdate?: () => void;
  onWindowsUpdate?: () => void;
  init?: () => void;
}) => {
  useEffect(() => {
    if (onTabsUpdate) {
      chrome.tabs.onUpdated.addListener(onTabsUpdate);
      chrome.tabs.onActivated.addListener(onTabsUpdate);
      chrome.tabs.onRemoved.addListener(onTabsUpdate);
      chrome.tabs.onMoved.addListener(onTabsUpdate);
    }
    if (onGroupsUpdate) {
      chrome.tabGroups.onUpdated.addListener(onGroupsUpdate);
    }
    if (onWindowsUpdate) {
      chrome.windows.onRemoved.addListener(onWindowsUpdate);
      chrome.windows.onCreated.addListener(onWindowsUpdate);
      chrome.windows.onFocusChanged.addListener(onWindowsUpdate);
    }
    if (init) {
      init();
    }
    return () => {
      if (onTabsUpdate) {
        chrome.tabs.onUpdated.removeListener(onTabsUpdate);
        chrome.tabs.onActivated.removeListener(onTabsUpdate);
        chrome.tabs.onRemoved.removeListener(onTabsUpdate);
        chrome.tabs.onMoved.removeListener(onTabsUpdate);
      }
      if (onGroupsUpdate) {
        chrome.tabGroups.onUpdated.removeListener(onGroupsUpdate);
      }
      if (onWindowsUpdate) {
        chrome.windows.onRemoved.removeListener(onWindowsUpdate);
        chrome.windows.onCreated.removeListener(onWindowsUpdate);
        chrome.windows.onFocusChanged.removeListener(onWindowsUpdate);
      }
    };
  }, [init, onGroupsUpdate, onTabsUpdate, onWindowsUpdate]);
};

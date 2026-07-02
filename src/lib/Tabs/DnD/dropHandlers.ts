import { TabItem } from "../types.ts";

export const moveTabsOnTab = async (
  drop: TabItem[],
  target: TabItem,
  forceUngroup?: boolean,
): Promise<void> => {
  const insertIndex = drop.reduce((count, tab) => {
    if (target.windowId === tab.windowId && target.index > tab.index) {
      return count + 1;
    } else {
      return count;
    }
  }, 0);
  const tabIds = drop
    .map(({ id }) => id)
    .filter((id) => id !== undefined) as number[];
  await chrome.tabs.ungroup(tabIds);
  await chrome.tabs.move(tabIds, {
    index: -1,
    windowId: target.windowId,
  });
  await chrome.tabs.move(tabIds, {
    //If dragged tab is before dropped, index has to be changed
    index: target.index - insertIndex,
    windowId: target.windowId,
  });
  if (target.groupId >= 0) {
    if (forceUngroup) {
      // Moving tabs onto a group's leading edge makes Chrome absorb them into
      // that group, so the earlier ungroup is undone. Ungroup again after the
      // final move to keep the tabs in the window, before the group.
      await chrome.tabs.ungroup(tabIds);
    } else {
      await chrome.tabs.group({
        tabIds: tabIds,
        groupId: target.groupId,
      });
    }
  }
};

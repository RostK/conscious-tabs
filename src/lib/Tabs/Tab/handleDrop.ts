import { DZonDrop } from "../DnD/useDropzone.tsx";
import { TabItem } from "../types.ts";

export const handleDrop: DZonDrop<TabItem> = async (drop, dropzone) => {
  if (Array.isArray(drop)) {
    const insertIndex = drop.reduce((count, tab) => {
      if (
        dropzone.data.windowId === tab.windowId &&
        dropzone.data.index > tab.index
      ) {
        return count + 1;
      } else {
        return count;
      }
    }, 0);
    const tabIds = drop.map(({ id }) => id) as number[];
    await chrome.tabs.ungroup(tabIds);
    await chrome.tabs.move(tabIds, {
      index: -1,
      windowId: dropzone.data.windowId,
    });
    await chrome.tabs.move(tabIds, {
      //If dragged tab is before dropped, index has to be changed
      index: dropzone.data.index - insertIndex,
      windowId: dropzone.data.windowId,
    });
    if (dropzone.data.groupId >= 0) {
      await chrome.tabs.group({
        tabIds: tabIds,
        groupId: dropzone.data.groupId,
      });
    }
  } else {
    switch (drop.type) {
      case "tab":
        await chrome.tabs.move(drop.id as number, {
          //If dragged tab is before dropped, index has to be changed
          index:
            drop.windowId === dropzone.data.windowId &&
            dropzone.data.index > drop.index
              ? dropzone.data.index - 1
              : dropzone.data.index,
          windowId: dropzone.data.windowId,
        });
        if (dropzone.data.groupId) {
          await chrome.tabs.group({
            tabIds: drop.id as number,
            groupId: dropzone.data.groupId,
          });
        } else {
          await chrome.tabs.ungroup(drop.id as number);
        }
        return;
      case "group":
        if (dropzone.data.windowId === drop.windowId) {
          try {
            await chrome.tabGroups.move(drop.id, {
              //If dragged tab is before dropped, index has to be changed
              index:
                dropzone.data.index > drop.tabs[0].index
                  ? dropzone.data.index - drop.tabs.length
                  : dropzone.data.index,
              //windowId: overTab.windowId,
            });
          } catch (e) {
            console.error(e);
          }
        } else {
          await chrome.tabGroups.move(drop.id, {
            index: dropzone.data.index,
            windowId: dropzone.data.windowId,
          });
        }
        return;
    }
  }
};

import { DZonDrop, moveTabsOnTab } from "../DnD";
import { GroupItem } from "../types.ts";

export const handleDrop: DZonDrop<GroupItem> = async (drop, dropzone) => {
  if (Array.isArray(drop)) {
    void moveTabsOnTab(drop, dropzone.data.tabs[0]);
  } else {
    switch (drop.type) {
      case "tab":
        void moveTabsOnTab([drop], dropzone.data.tabs[0], true);
        return;
      case "group":
        if (dropzone.data.windowId === drop.windowId) {
          try {
            await chrome.tabGroups.move(drop.id, {
              //If dragged tab is before dropped, index has to be changed
              index:
                dropzone.data.tabs[0].index > drop.tabs[0].index
                  ? dropzone.data.tabs[0].index - drop.tabs.length
                  : dropzone.data.tabs[0].index,
            });
          } catch (e) {
            console.error(e);
          }
        } else {
          await chrome.tabGroups.move(drop.id, {
            index: dropzone.data.tabs[0].index,
            windowId: dropzone.data.windowId,
          });
        }
        return;
    }
  }
};

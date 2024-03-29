import { DZonDrop , moveTabsOnTab } from "../DnD";
import { TabItem } from "../types.ts";

export const handleDrop: DZonDrop<TabItem> = async (drop, dropzone) => {
  if (Array.isArray(drop)) {
    void moveTabsOnTab(drop, dropzone.data);
  } else {
    switch (drop.type) {
      case "tab":
        void moveTabsOnTab([drop], dropzone.data);
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

import { DZonDrop, moveTabsOnTab } from "../DnD";
import { GroupItem } from "../types.ts";

export const handleDrop: DZonDrop<GroupItem> = async (drop, dropzone) => {
  // Awaited, for the reasons given in Tab/handleDrop.ts.
  if (Array.isArray(drop)) {
    await moveTabsOnTab(drop, dropzone.data.tabs[0], true);
  } else {
    switch (drop.type) {
      case "tab":
        await moveTabsOnTab([drop], dropzone.data.tabs[0], true);
        return;
      case "group":
        if (dropzone.data.windowId === drop.windowId) {
          // Not caught here; see Tab/handleDrop.ts.
          await chrome.tabGroups.move(drop.id, {
            //If dragged tab is before dropped, index has to be changed
            index:
              dropzone.data.tabs[0].index > drop.tabs[0].index
                ? dropzone.data.tabs[0].index - drop.tabs.length
                : dropzone.data.tabs[0].index,
          });
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

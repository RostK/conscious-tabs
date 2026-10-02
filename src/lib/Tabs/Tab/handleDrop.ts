import { DZonDrop , moveTabsOnTab } from "../DnD";
import { TabItem } from "../types.ts";

export const handleDrop: DZonDrop<TabItem> = async (drop, dropzone) => {
  // Awaited, not fired and forgotten: `App` waits on this to clear a dropped
  // selection and to hear a move Chrome refused.
  if (Array.isArray(drop)) {
    await moveTabsOnTab(drop, dropzone.data);
  } else {
    switch (drop.type) {
      case "tab":
        await moveTabsOnTab([drop], dropzone.data);
        return;
      case "group":
        if (dropzone.data.windowId === drop.windowId) {
          // Not caught here. Chrome refuses some group moves (into the middle
          // of another group, among pinned tabs), and `App` is where a refused
          // drop is logged and said aloud; swallowing it left the screen
          // reader's "Moved …" standing with nothing moved.
          await chrome.tabGroups.move(drop.id, {
            //If dragged tab is before dropped, index has to be changed
            index:
              dropzone.data.index > drop.tabs[0].index
                ? dropzone.data.index - drop.tabs.length
                : dropzone.data.index,
          });
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

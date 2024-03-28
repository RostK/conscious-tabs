import { DZonDrop, moveTabsOnTab } from "../DnD";
import { GroupItem } from "../types.ts";

export const handleInnerDrop: DZonDrop<GroupItem> = async (drop, dropzone) => {
  if (Array.isArray(drop)) {
    void moveTabsOnTab(drop, dropzone.data.tabs[0]);
  } else {
    switch (drop.type) {
      case "tab":
        await chrome.tabs.group({
          groupId: dropzone.data.id,
          tabIds: drop.id,
        });
        return;
      case "group":
        return;
    }
  }
};

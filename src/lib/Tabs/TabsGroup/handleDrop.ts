import { DZonDrop } from "../DnD/useDropzone.tsx";
import { GroupItem } from "../types.ts";

export const handleDrop: DZonDrop<GroupItem> = async (drop, dropzone) => {
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
};

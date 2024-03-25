import { DZonDrop } from "../DnD/useDropzone.tsx";
import { GroupItem } from "../types.ts";

export const handleDrop: DZonDrop<GroupItem> = async (drop, dropzone) => {
  switch (drop.type) {
    case "tab":
      await chrome.tabs.move(drop.id as number, {
        index:
          drop.windowId === dropzone.data.windowId &&
          dropzone.data.tabs[0].index > drop.index
            ? dropzone.data.tabs[0].index - 1
            : dropzone.data.tabs[0].index,
      });
      await chrome.tabs.ungroup(drop.id as number);
      return;
    case "group":
      return;
  }
};

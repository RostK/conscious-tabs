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
};

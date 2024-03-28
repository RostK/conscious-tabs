import { DZonDrop } from "../DnD";

export const handleInnerDrop: DZonDrop<chrome.windows.Window> = async (
  drop,
  dropzone,
) => {
  if (Array.isArray(drop)) {
    await chrome.tabs.move(drop.map(({ id }) => id) as number[], {
      windowId: dropzone.data.id,
      index: 0,
    });
  } else {
    switch (drop.type) {
      case "tab":
        await chrome.tabs.move(drop.id as number, {
          windowId: dropzone.data.id,
          index: 0,
        });
        return;
      case "group":
        if (dropzone.data.id === drop.windowId) {
          await chrome.tabGroups.move(drop.id, {
            index: 0,
          });
        } else {
          await chrome.tabGroups.move(drop.id, {
            index: 0,
            windowId: dropzone.data.id,
          });
        }
        return;
    }
  }
};

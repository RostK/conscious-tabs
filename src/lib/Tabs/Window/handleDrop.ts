import { DZonDrop } from "../DnD";

export const handleDrop: DZonDrop<chrome.windows.Window> = async (
  drop,
  dropzone,
) => {
  if (Array.isArray(drop)) {
    await chrome.tabs.move(drop.map(({ id }) => id) as number[], {
      windowId: dropzone.data.id,
      index: -1,
    });
  } else {
    switch (drop.type) {
      case "tab":
        await chrome.tabs.move(drop.id as number, {
          windowId: dropzone.data.id,
          index: -1,
        });
        return;
      case "group":
        if (dropzone.data.id === drop.windowId) {
          await chrome.tabGroups.move(drop.id, {
            index: -1,
          });
        } else {
          await chrome.tabGroups.move(drop.id, {
            index: -1,
            windowId: dropzone.data.id,
          });
        }
        return;
    }
  }
};

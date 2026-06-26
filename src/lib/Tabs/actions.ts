import { enqueueSnackbar } from "notistack";

/**
 * Runs a chrome.* tab action, surfacing failures to the user instead of
 * swallowing them silently. `label` reads as "Couldn't <label>".
 */
const run = async (label: string, fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch {
    enqueueSnackbar(`Couldn't ${label}`, { variant: "error" });
  }
};

export const closeTab = (id: number) =>
  run("close tab", () => chrome.tabs.remove(id));

export const setPinned = (id: number, pinned: boolean) =>
  run(pinned ? "pin tab" : "unpin tab", () =>
    chrome.tabs.update(id, { pinned }),
  );

export const setMuted = (id: number, muted: boolean) =>
  run(muted ? "mute tab" : "unmute tab", () =>
    chrome.tabs.update(id, { muted }),
  );

export const duplicateTab = (id: number) =>
  run("duplicate tab", () => chrome.tabs.duplicate(id));

export const hardReloadTab = (id: number) =>
  run("reload tab", () => chrome.tabs.reload(id, { bypassCache: true }));

export const moveTabToNewWindow = (id: number) =>
  run("move tab", async () => {
    const { id: windowId } = await chrome.windows.create({
      tabId: id,
      focused: true,
    });
    if (windowId) {
      await chrome.sidePanel.open({ windowId });
    }
  });

import { enqueueSnackbar } from "notistack";

import { bringPanelAlong } from "../surfaces.ts";

/**
 * Runs a chrome.* tab action, surfacing failures to the user instead of
 * swallowing them silently. `label` reads as "Couldn't <label>". Resolves to
 * whether it worked, for a caller that has more to do only if it did.
 */
const run = async (
  label: string,
  fn: () => Promise<unknown>,
): Promise<boolean> => {
  try {
    await fn();
    return true;
  } catch {
    enqueueSnackbar(`Couldn't ${label}`, { variant: "error" });
    return false;
  }
};

export const closeTab = (id: number) =>
  run("close tab", () => chrome.tabs.remove(id));

export const closeTabs = (ids: number[]) =>
  run("close tabs", () => chrome.tabs.remove(ids));

export const closeWindow = (id: number) =>
  run("close window", () => chrome.windows.remove(id));

export const setPinned = (id: number, pinned: boolean) =>
  run(pinned ? "pin tab" : "unpin tab", () =>
    chrome.tabs.update(id, { pinned }),
  );

export const setMuted = (id: number, muted: boolean) =>
  run(muted ? "mute tab" : "unmute tab", () =>
    chrome.tabs.update(id, { muted }),
  );

export const activateTab = (id: number, windowId: number) =>
  run("switch to tab", async () => {
    await bringPanelAlong(windowId);
    await chrome.tabs.update(id, { active: true });
    await chrome.windows.update(windowId, { focused: true });
  });

/**
 * Makes a new group of `ids` in `windowId`, then names and colours it.
 *
 * The window is always given. Left out, Chrome makes the group in the
 * *caller's* window — which from the float is the Picture-in-Picture window,
 * where tab groups are not supported, so the call was refused; and from the
 * side panel it is the panel's window, so tabs picked in another one were
 * dragged across to it. Grouping nothing showed, because the refusal went to
 * an empty `catch`.
 */
export const groupTabs = (
  ids: number[],
  windowId: number,
  { title, color }: { title?: string; color: chrome.tabGroups.ColorEnum },
) =>
  run("group tabs", async () => {
    const groupId = await chrome.tabs.group({
      tabIds: ids,
      createProperties: { windowId },
    });
    await chrome.tabGroups.update(groupId, { title, color });
  });

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
      await bringPanelAlong(windowId);
    }
  });

import { openAnchorTab } from "../lib/anchorTab.ts";

/** The command declared in `manifest.json`. */
export const OPEN_COMMAND = "open-conscious-tabs";

/**
 * The extension's own origin, captured at import rather than per command.
 *
 * `surfaces.ts` exports `isOwnPage`, and this deliberately does not use it: it
 * calls `chrome.runtime.getURL` on every check, and AC-36 forbids **any**
 * `chrome.*` call before `sidePanel.open()`. That rule is stricter than the
 * mechanism behind it — `getURL` is synchronous and cannot spend transient
 * activation — but a rule that has to be reasoned about per call site is one
 * that eventually gets reasoned about wrongly, by someone adding a lookup that
 * *does* await. So the one-line predicate is duplicated and the rule stays
 * mechanical: nothing in the handler touches `chrome.*` until the open.
 *
 * Captured at import is also why the worker tests must install the stub before
 * importing this module — see `index.test.ts` for the recipe.
 */
const OWN_PAGE = chrome.runtime.getURL("");

/**
 * What the keyboard shortcut does.
 *
 * Chrome hands the listener the active tab (`CommandEvent` is
 * `(command, tab) => void`), which is the fact the whole design rests on:
 * `windowId` is already in hand, so nothing has to be looked up and therefore
 * nothing has to be awaited before the panel is opened. A `sidePanel.open()`
 * that runs after an await is rejected for want of user activation, and it
 * fails silently — the key simply does nothing, which is indistinguishable
 * from the shortcut not being bound at all.
 */
export const handleCommand = (command: string, tab?: chrome.tabs.Tab): void => {
  // Other commands are not ours to interpret. There is only one today, and
  // this is what keeps a second one from inheriting this behaviour by default.
  if (command !== OPEN_COMMAND) return;

  const windowId = tab?.windowId;

  /*
   * Already looking at the manager: bring its window forward and stop.
   *
   * Opening the side panel here would put a second copy of the UI beside the
   * one being used — and if the anchor tab is holding a float, the panel is
   * the surface the user deliberately left.
   */
  if (tab?.url?.startsWith(OWN_PAGE)) {
    if (windowId !== undefined) {
      void chrome.windows.update(windowId, { focused: true });
    }
    return;
  }

  /*
   * No window to open a panel in. The types say the tab is always delivered,
   * but nothing in Chrome's documentation promises it for every state the
   * browser can be in, and a side panel without a window id has nowhere to go.
   * One line, and the sweep records whether it is ever reached.
   */
  if (windowId === undefined) {
    void openAnchorTab();
    return;
  }

  // The first `chrome.*` call in this function, on every path that reaches it.
  void chrome.sidePanel.open({ windowId }).catch(openAnchorTab);
};

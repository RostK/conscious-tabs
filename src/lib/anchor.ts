import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

import { getHost } from "./host";

/*
 * The anchor tab's URL and its find-or-create opener used to live here.
 * They moved to ./anchorTab.ts, which imports nothing but `chrome.*`, so the
 * service worker can use them: this module pulls in notistack and react at
 * module scope and the worker has neither a DOM nor a React tree. Deliberately
 * not re-exported from here — a re-export would leave the very import the
 * split exists to prevent.
 */

/**
 * Close this document, but only if it really is the side panel.
 *
 * There is no `chrome.sidePanel.close()` (w3c/webextensions#521); a panel page
 * closing itself is the supported way, and it turns the hand-off to the anchor
 * tab into a move rather than leaving a second copy of the UI open behind it.
 *
 * `getHost() === "panel"` is *not* sufficient on its own, because an extension
 * page in a plain tab has no `?host=` either — closing on that alone would shut
 * a real browser tab. `chrome.tabs.getCurrent()` resolves to a tab when we are
 * in one and to undefined in the side panel, but it is also undefined inside
 * the float's iframe, so both conditions are required.
 */
export const closeIfSidePanel = async (): Promise<void> => {
  if (getHost() !== "panel") return;
  const tab = await chrome.tabs.getCurrent();
  if (!tab) {
    window.close();
  }
};

/**
 * Hand back: open the side panel in this tab's window, then close this tab.
 *
 * The mirror image of the outbound trip, so there is exactly one copy of the
 * manager at any moment. `windowId` has to be known *before* the click,
 * because `chrome.sidePanel.open()` requires a user gesture and awaiting a
 * lookup inside the handler would spend it — the same trap as
 * `requestWindow()` in ./float.ts, for the same reason.
 */
export const backToSidePanel = (self: chrome.tabs.Tab): void => {
  if (self.windowId === undefined) return;
  void chrome.sidePanel
    .open({ windowId: self.windowId })
    .then(() =>
      self.id === undefined ? undefined : chrome.tabs.remove(self.id),
    )
    .catch(() => {
      enqueueSnackbar("Couldn't open the side panel", { variant: "error" });
    });
};

/** This document's own tab, or undefined when it is not running in one. */
export const useSelfTab = (): chrome.tabs.Tab | undefined => {
  const [self, setSelf] = useState<chrome.tabs.Tab>();
  useEffect(() => {
    void chrome.tabs.getCurrent().then(setSelf);
  }, []);
  return self;
};

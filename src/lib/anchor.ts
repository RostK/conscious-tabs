import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

import { getHost } from "./host";

/**
 * The anchor tab: this extension's page running in a normal browser tab.
 *
 * It is a legitimate surface in its own right — a roomy triage view someone may
 * prefer over the side panel — and it is also the only document allowed to open
 * the floating window, because Document Picture-in-Picture refuses to open from
 * anywhere that is not a top-level traversable (the side panel is not one).
 */
export const ANCHOR_URL = () =>
  chrome.runtime.getURL("index.html?host=anchor");

/** Any page served by this extension, in tab-URL form. */
const isExtensionPage = (url?: string): boolean =>
  Boolean(url?.startsWith(chrome.runtime.getURL("")));

const isAnchorTab = (tab: chrome.tabs.Tab): boolean =>
  new URLSearchParams(tab.url?.split("?")[1] ?? "").get("host") === "anchor";

/**
 * True for the tab that is (or can be) holding the float. Used to mark it in
 * the mirrored list and keep the manager from offering to close it.
 */
export const isAnchorUrl = isExtensionPage;

/**
 * Focus the anchor tab, creating it only if there isn't one — never a second.
 *
 * Prefers a tab that is already an anchor over a bare extension page left over
 * from before this feature existed: if both offered a float control, the second
 * one opened would evict the first, since Chrome allows exactly one
 * Picture-in-Picture window per browser across every tab and extension.
 */
export const openAnchorTab = async (): Promise<void> => {
  const pages = await chrome.tabs.query({
    url: chrome.runtime.getURL("*"),
  });
  const [existing] = [...pages].sort(
    (a, b) => Number(isAnchorTab(b)) - Number(isAnchorTab(a)),
  );

  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, {
      active: true,
      // Upgrade a pre-feature extension tab on the way. Navigating is safe
      // here: a tab that is not already an anchor cannot be holding a float.
      ...(isAnchorTab(existing) ? {} : { url: ANCHOR_URL() }),
    });
    await chrome.windows.update(existing.windowId, { focused: true });
    return;
  }

  await chrome.tabs.create({ url: ANCHOR_URL(), active: true });
};

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
    .then(() => (self.id === undefined ? undefined : chrome.tabs.remove(self.id)))
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

import { createBrowserStore, sameData } from "../browserStore.ts";
import { isBrowsingWindow } from "../surfaces.ts";

/**
 * The browser windows the user actually browses in.
 *
 * Browsing windows only. Our own float is reported by `chrome.windows` as an
 * ordinary `type: "normal"` window, so filtering on type does nothing: it
 * showed up in the list holding a single about:blank tab, called itself
 * focused (which auto-expanded it), and carried a close button that would have
 * destroyed the float. `alwaysOnTop` is what actually separates them.
 */
const store = createBrowserStore<chrome.windows.Window[]>({
  label: "the browser's windows",
  equals: sameData,
  events: () => [
    chrome.windows.onCreated,
    chrome.windows.onRemoved,
    chrome.windows.onFocusChanged,
  ],
  load: async () =>
    (await chrome.windows.getAll({ windowTypes: ["normal"] })).filter(
      isBrowsingWindow,
    ),
});

/**
 * `undefined` until the first read resolves, for the same reason the tab list
 * is: an empty array is a claim that the user has no browsing windows, and
 * both views draw a conclusion from it. Flattening the two together here put
 * the "have we actually looked yet" test in every consumer instead of in the
 * type, where the next consumer has to know to write it.
 */
export const useWindowsStructure = (): chrome.windows.Window[] | undefined =>
  store.useValue();

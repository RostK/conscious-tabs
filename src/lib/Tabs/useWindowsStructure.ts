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

export const useWindowsStructure = (): chrome.windows.Window[] =>
  store.useValue() ?? [];

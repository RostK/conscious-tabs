import { createBrowserStore } from "../browserStore.ts";
import { resolveUserWindow } from "../surfaces.ts";

/**
 * The browser window the user is working in, kept current as they move.
 *
 * In the side panel this never changes — a panel belongs to one window for its
 * whole life. In the anchor tab and the float it has to follow the user, which
 * is the entire difference: those surfaces outlive any single window, so
 * "which window am I in" stops being a fact about the document and becomes a
 * question about the user.
 *
 * A store rather than per-component state because three hooks ask it, and
 * resolving is a `getLastFocused` plus a `tabs.query` per candidate window —
 * paid once per focus change now rather than once per asker.
 *
 * Wrapped in an object on purpose: `resolveUserWindow` answers `undefined`
 * when every window is one of ours, and the store reads a bare `undefined` as
 * "not loaded yet". Boxed, "we looked and there is none" is a real answer that
 * can be compared and cached like any other.
 */
const store = createBrowserStore<{ id?: number }>({
  label: "the user's window",
  equals: (a, b) => a.id === b.id,
  events: () => [
    chrome.windows.onCreated,
    chrome.windows.onRemoved,
    chrome.windows.onFocusChanged,
  ],
  load: async () => ({ id: await resolveUserWindow() }),
});

export const useUserWindow = (): number | undefined => store.useValue()?.id;

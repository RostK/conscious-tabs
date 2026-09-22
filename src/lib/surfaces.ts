import { getHost } from "./host";

/**
 * Open the side panel in a window we are about to focus — but only when the
 * side panel is where the user actually is.
 *
 * Six call sites used to call `chrome.sidePanel.open({ windowId })`
 * unconditionally. That encodes a per-window host model: "focus that window,
 * and bring the panel along." It is right for a side panel, which belongs to
 * exactly one browser window. It is wrong for the anchor tab and the float,
 * which belong to none — from either of those it would reopen the very panel
 * the user dismissed on the way out.
 *
 * It was also the *first* await in each of those sequences, which made the
 * failure mode much worse than a stray panel. From the float the call rejects,
 * so everything after it — the actual tab activation — never ran, and an empty
 * `catch {}` swallowed the reason. The symptom was simply that clicking a tab
 * in the floating window did nothing at all.
 *
 * Call this before any other await in a click handler: `sidePanel.open()`
 * requires a live user gesture, and anything awaited first spends it.
 */
export const bringPanelAlong = async (windowId: number): Promise<void> => {
  if (getHost() !== "panel") return;
  // May already be open, or the gesture may have been spent by a caller we do
  // not control. Neither is worth failing the surrounding action over.
  await chrome.sidePanel.open({ windowId }).catch(() => undefined);
};

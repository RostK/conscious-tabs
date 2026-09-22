import { getHost } from "./host";

/**
 * True for any page served by this extension — the anchor tab, and the
 * extension page in a plain tab.
 *
 * These are filtered out of the mirrored list entirely. The alternative was a
 * marked, non-closable row, on the reasoning that Chrome shows the tab in its
 * own strip either way and a manager that denies it exists is lying. Filtering
 * won on a blunter argument: a row you cannot close, cannot select and cannot
 * bulk-act on is three special cases in the list rendering, and every one of
 * them is a place for the self-destruct path to come back.
 */
export const isOwnPage = (url?: string): boolean =>
  Boolean(url?.startsWith(chrome.runtime.getURL("")));

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

/**
 * Which browser window the user is actually working in.
 *
 * The side panel belongs to exactly one window, so there the answer is simply
 * that window. The anchor tab and the float belong to none — and
 * `chrome.windows.getCurrent()` in either of them returns the *extension's*
 * window, which is how the float's current-tab card came to describe the float
 * rather than whatever the user was reading.
 *
 * A window qualifies when its active tab is not one of our own pages. That is
 * AC-17's requirement stated directly: never present the extension's own tab
 * as the user's current tab.
 *
 * Picture-in-Picture windows are excluded by `windowTypes: ["normal"]`, the
 * same assumption the mirrored list relies on.
 */
export const resolveUserWindow = async (): Promise<number | undefined> => {
  if (getHost() === "panel") {
    const { id } = await chrome.windows.getCurrent();
    return id;
  }

  const recent = await chrome.windows.getLastFocused({
    windowTypes: ["normal"],
  });
  if (await isUserWindow(recent.id)) return recent.id;

  // getAll() carries no recency order, so this is a deliberate approximation
  // rather than an oversight: the first normal window the user is plausibly
  // in. It only applies before any focus change has been observed, or when
  // the last-focused window is the anchor's own.
  const all = await chrome.windows.getAll({ windowTypes: ["normal"] });
  for (const candidate of all) {
    if (await isUserWindow(candidate.id)) return candidate.id;
  }
  return undefined;
};

const isUserWindow = async (windowId?: number): Promise<boolean> => {
  if (windowId === undefined) return false;
  const [active] = await chrome.tabs.query({ active: true, windowId });
  return Boolean(active?.url) && !isOwnPage(active.url);
};

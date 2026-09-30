/**
 * The anchor tab: this extension's page running in a normal browser tab.
 *
 * It is a legitimate surface in its own right — a roomy triage view someone may
 * prefer over the side panel — and it is also the only document allowed to open
 * the floating window, because Document Picture-in-Picture refuses to open from
 * anywhere that is not a top-level traversable (the side panel is not one).
 *
 * **This module imports nothing but `chrome.*`, and that is load-bearing.** It
 * was split out of `anchor.ts`, which imports `notistack` and `react` at module
 * scope: the service worker has no `window` and no React tree, so importing
 * that module from the worker would drag react-dom and notistack into a context
 * that can use neither. The worker needs `openAnchorTab` as the fallback when
 * the side panel refuses to open (SPEC-05 AC-8), so the half it needs lives
 * here and the half that needs a DOM stays behind. Keep it that way — a
 * re-export from `anchor.ts` would leave exactly the import this split exists
 * to prevent.
 */
export const ANCHOR_URL = () => chrome.runtime.getURL("index.html?host=anchor");

/**
 * Parsed as a URL, not split on the first "?".
 *
 * `split("?")[1]` hands the fragment to URLSearchParams along with the query,
 * so `index.html?host=anchor#anything` reads as host `"anchor#anything"` and a
 * real anchor tab stops being recognised as one. openAnchorTab would then take
 * it for a stale extension page and navigate it — destroying the float it was
 * holding, which is the one thing that path promises never to do.
 */
const isAnchorTab = (tab: chrome.tabs.Tab): boolean => {
  if (!tab.url) return false;
  try {
    return new URL(tab.url).searchParams.get("host") === "anchor";
  } catch {
    // A tab we cannot parse is not one we should navigate.
    return false;
  }
};

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

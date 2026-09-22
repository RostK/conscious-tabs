import { getFloatState } from "../../float.ts";
import { getHost } from "../../host.ts";

/**
 * Whether *this* copy of the app should raise the undo prompt.
 *
 * `SyncPrompt` subscribes to `chrome.tabs.onRemoved` in every live document.
 * With the anchor tab and the float both mounted — which is the normal state
 * of this feature, not an edge case — closing one tab raised two prompts, and
 * pressing UNDO in both restored twice. AC-19 requires the surfaces to
 * converge "with no duplicated and no lost operation", and a double restore
 * is exactly a duplicated one.
 *
 * Two rules, in order of how much they actually know:
 *
 * 1. **Exact.** The anchor tab keeps rendering behind its float, but the float
 *    is what the user is looking at — that is the entire point of opening it.
 *    The anchor knows whether its float is up, so it can simply defer.
 * 2. **Heuristic.** Otherwise, stay quiet if nobody is looking at this
 *    document. It is imperfect: a side panel in an unfocused window still
 *    reports itself visible, so a user who deliberately reopens the panel
 *    while floating (E-5) can still get two. That case is rare, user-created,
 *    and the alternatives are worse — electing one prompter across documents
 *    needs either `chrome.storage`, which AC-23 forbids outright, or runtime
 *    messaging, which is a lot of machinery for a duplicate toast.
 *
 * Deliberately *not* `document.hasFocus()`: when a tab is closed from Chrome's
 * own tab strip, none of our documents has focus, and the prompt would vanish
 * in the case it is most useful.
 */
export const shouldPrompt = (): boolean => {
  if (getHost() === "anchor" && getFloatState() === "open") return false;
  return !document.hidden;
};

import { RefObject, useEffect } from "react";

/**
 * Put the caret in one element when a surface opens, and leave it there.
 *
 * **Why this is not `autoFocus`.** Measured on 2026-09-29: a side panel opened
 * by the keyboard shortcut does not take document focus at all — typing goes to
 * the page behind it. Chrome offers no way to ask for that focus and no way to
 * force it, and forcing it is forbidden anyway (a surface that steals focus
 * from the page is worse than one that waits). So `autoFocus` alone would
 * settle the caret in a document nobody is typing into, and the first keystroke
 * after the user finally clicks in would still be lost.
 *
 * What works is claiming the caret twice: once on mount, which covers every
 * surface that *does* open focused, and once more at the moment the document
 * first receives focus — which may be seconds later, or never.
 *
 * The second claim is deliberately timid. It fires only while
 * `document.activeElement` is still `document.body`, so a user who arrived by
 * clicking a row, or who tabbed somewhere before focus settled, is never
 * yanked back to the field. Anything less careful is the autofocus-steals-focus
 * complaint wearing a different hat.
 */
export const useInitialFocus = (ref: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    ref.current?.focus();

    // Already focused: the caret is where it needs to be and nothing else is
    // owed. Listening anyway would arm a claim for the next alt-tab back.
    if (document.hasFocus()) return;

    const claimIfUnclaimed = () => {
      if (document.activeElement === document.body) ref.current?.focus();
    };
    window.addEventListener("focus", claimIfUnclaimed, { once: true });
    return () => {
      window.removeEventListener("focus", claimIfUnclaimed);
    };
  }, [ref]);
};

import { useCallback, useRef } from "react";

/**
 * Keeps whatever takes focus clear of a bar that sits over the page.
 *
 * The header is sticky and the action bar is fixed, so both cover part of the
 * scrolling list. A browser scrolls a newly focused element into view only if
 * it is outside the *viewport*, and a row lying wholly under one of those bars
 * is inside it. So Tab moved focus to a row nobody could see: measured at 80
 * rows and 400px, Shift+Tab left the focused row entirely under the header,
 * and Tab left it entirely under the action bar (SPEC-04 AC-7).
 *
 * `scroll-padding` on the scroller is how a page tells the browser that part
 * of its viewport is covered. With it, the same key presses bring the row to
 * the middle of what is actually visible.
 *
 * Measured, not a constant: the header grows with the current-tab card and the
 * notices under it, and the action bar grows by the selection toolbar.
 *
 * Returns a ref for the bar. The padding goes on the root of the bar's *own*
 * document, because the float renders this app inside an iframe.
 */
export const useScrollPadding = (side: "top" | "bottom") => {
  const stop = useRef<() => void>();

  return useCallback(
    (bar: HTMLElement | null) => {
      stop.current?.();
      stop.current = undefined;
      if (!bar) return;

      const root = bar.ownerDocument.documentElement;
      const property =
        side === "top" ? "scrollPaddingTop" : "scrollPaddingBottom";
      const measure = () => {
        root.style[property] =
          `${Math.ceil(bar.getBoundingClientRect().height)}px`;
      };
      measure();

      // The bar's own window's observer: an element in the float's iframe is
      // not reliably observed by an observer built in another window.
      const Observer = bar.ownerDocument.defaultView?.ResizeObserver;
      const observer = Observer ? new Observer(measure) : undefined;
      observer?.observe(bar);

      stop.current = () => {
        observer?.disconnect();
        root.style[property] = "";
      };
    },
    [side],
  );
};

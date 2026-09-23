import { KeyboardEventHandler, useCallback } from "react";

/**
 * How every row in this list handles its own controls.
 *
 * Two rules, learned the hard way and shared so all three row types — tab,
 * group and window — behave identically.
 *
 * **Hide with opacity, never visibility.** `visibility: hidden` does not just
 * take an element out of Tab, it takes it out of `focus()` entirely, so
 * anything hidden that way is unreachable by keyboard no matter what code
 * tries to focus it. It fails silently, and it fails *intermittently* — it
 * appears to work whenever something else revealed the control first.
 *
 * **One tab stop per row.** Making the controls focusable turned each row into
 * four stops, which is eighty in a list of twenty tabs just to walk past them.
 * They sit at `tabIndex: -1` and are reached with Left/Right instead.
 */

/** Spread onto a control that Left/Right should reach. */
export const rowControlProps = {
  "data-row-control": true,
  tabIndex: -1,
} as const;

/**
 * Put on the row itself. Handles both shapes this codebase uses: controls
 * marked directly (tab rows) and controls wrapped in a `.itemAction` div
 * (group and window rows), which is why `:focus-within` is in the list — the
 * wrapper is a div, so it is never itself focused.
 */
// Left to infer: annotating it SxProps<Theme> makes it unassignable inside
// MUI's sx array overload.
export const rowControlsSx = {
  "& .itemAction": {
    opacity: 0,
    pointerEvents: "none",
  },
  [[
    "&:hover .itemAction",
    "&:focus-visible .itemAction",
    "&:has(:focus-visible) .itemAction",
    "& .itemAction:focus",
    "& .itemAction:focus-within",
  ].join(", ")]: {
    opacity: 1,
    pointerEvents: "auto",
  },
};

/**
 * Left/Right move along a row's controls; Tab moves between rows.
 *
 * Safe to own the arrow keys: dnd-kit uses them during a keyboard drag, but
 * the row unmounts while it is being dragged, so this handler does not exist
 * at that moment.
 */
export const useRowKeys = (): KeyboardEventHandler<HTMLDivElement> =>
  useCallback((event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const row = event.currentTarget;
    const stops: HTMLElement[] = [
      row,
      ...row.querySelectorAll<HTMLElement>("[data-row-control]"),
    ];
    const at = stops.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const next = at + (event.key === "ArrowRight" ? 1 : -1);
    if (next < 0 || next >= stops.length) return;
    event.preventDefault();
    event.stopPropagation();
    stops[next].focus();
  }, []);

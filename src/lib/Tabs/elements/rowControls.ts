import { useDndContext } from "@dnd-kit/core";
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
    // A checked box is state, not an affordance — it has to survive the
    // pointer leaving. The attribute selector is what makes it stick: the
    // row's own `& .itemAction` rule outranks anything the control sets on
    // itself, so saying "opacity: 1" on the button never worked.
    "& .itemAction[data-selected]",
  ].join(", ")]: {
    opacity: 1,
    pointerEvents: "auto",
  },
};

/** Spread onto a control that must stay visible while it is switched on. */
export const selectedProps = (selected: boolean) =>
  selected ? { "data-selected": true } : {};

/**
 * Left/Right move along a row's controls; Tab moves between rows.
 *
 * Except while a drag is live, when the arrows belong to dnd-kit. A tab row
 * unmounts as soon as it is picked up, so this handler genuinely is not there
 * — but a group row stays mounted until something is hovered, and for that
 * stretch this handler would claim the first arrow press, move focus off the
 * drag handle and stop the event before dnd-kit's KeyboardSensor saw it.
 *
 * dnd-kit's own context says whether a drag is in progress, which is the
 * question being asked. An earlier version read `aria-pressed` off the
 * focused element, which dnd-kit does set on the activator — but that
 * attribute means "this toggle is on", so the first row control to become a
 * genuine toggle would have silently switched the arrow keys off.
 */
export const useRowKeys = (): KeyboardEventHandler<HTMLDivElement> => {
  const { active } = useDndContext();

  return useCallback(
    (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (active) return;
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
    },
    [active],
  );
};

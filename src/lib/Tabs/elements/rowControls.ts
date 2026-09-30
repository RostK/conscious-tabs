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
 * The row states in which a hidden control is showing, asked of the row rather
 * than of the control.
 *
 * `rowControlsSx` below asks the same question, but per control, and its list
 * is deliberately not this one: it adds `[data-selected]`, which keeps a
 * ticked checkbox up after the pointer has left, and it reveals a focused
 * control by naming the control rather than the row. Both differences matter
 * to `rowTailMaskSx`, which has to know whether anything is showing *on the
 * right* — the checkbox sits in the row's left padding, so a selected row with
 * the pointer elsewhere has nothing over there to mask.
 */
const revealedRow = [
  "&:hover",
  "&:focus-visible",
  "&:has(:focus-visible)",
  "&:has(.itemAction:focus)",
];

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

/**
 * Fades a row's text out where its controls will appear.
 *
 * The controls are absolutely positioned, so something has to keep the text
 * out from under them. Reserving padding — which is what the tab row did —
 * spends that width whether or not anything is occupying it, and they are
 * `opacity: 0` until the row is hovered or focused: every title in a list of
 * eighty was ellipsising against fifty-eight pixels of nothing.
 *
 * Reserving on hover instead would reflow the text the moment the pointer
 * arrived, and letting the title run underneath needs an opaque fill on each
 * button to stay legible — the fill that used to make them read as white
 * patches stamped over a hovered row. A mask is neither: it takes no part in
 * layout, so nothing moves, and it takes the tail away rather than covering
 * it. The cost is that a long title on a hovered row fades out where it used
 * to end in an ellipsis.
 *
 * `controls` is the width the row's controls occupy, measured from the right
 * edge of its text. The gradient is fully transparent by then, so no title is
 * ever half-legible behind an icon; the 24px before it are the ramp.
 */
export const rowTailMaskSx = (controls: number) => ({
  [revealedRow.map((state) => `${state} .MuiListItemText-root`).join(", ")]: {
    maskImage: `linear-gradient(to right, #000 calc(100% - ${
      controls + 24
    }px), transparent calc(100% - ${controls}px))`,
  },
});

/**
 * Keeps a row's text short of its controls by reserving the width instead.
 *
 * The counterpart to `rowTailMaskSx`, for a row whose text box holds something
 * *filled* rather than plain text — `GroupDisplay`'s `Chip`. A mask fades the
 * whole `.MuiListItemText-root`, which on that row takes the pill's tint and
 * its rounded right edge along with the label and leaves the chip dissolving
 * wherever the controls appear. Handing the space back at rest is no better:
 * a pill that resizes as the pointer arrives redraws itself under it, where
 * plain text merely re-ellipsises.
 *
 * So this one spends the width permanently, and accepts exactly the cost the
 * mask exists to avoid — the name ellipsises early on a row at rest. Which of
 * the two a row wants follows what is being truncated, not which row it is.
 *
 * Applied to the element that is actually too wide, not to the row: the chip's
 * own `max-width: 100%` is what fills the text box, so that is what has to be
 * capped.
 *
 * `controls` is the width they occupy, measured from the right edge of the
 * text — the secondary action's *own* width, never the sum of its buttons.
 * `edge="end"` is a -12px margin, so the container comes out 12px narrower
 * than its children add up to (88.3 against 100.3 on a group row), and it is
 * the container's left edge that says where the leftmost control starts. The
 * 8px on top keeps a rounded edge off the first control's hover fill.
 *
 * **Below `controls + 8` of text box there is nothing left to reserve and the
 * element collapses to zero** — measured at a 250px row, where the box is
 * 94.9px and the group name disappears completely. Deliberately not floored:
 * any floor big enough to keep the name readable puts it back under the
 * controls, which is the defect this exists to prevent. A row that narrow has
 * to drop something, and choosing what is not this function's call.
 */
export const rowTailReserveSx = (controls: number) => ({
  maxWidth: `calc(100% - ${controls + 8}px)`,
});

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
 * Whether a drag is running is asked at event time, not subscribed to.
 * `App`'s DndContext handlers set the flag below, which costs nothing and
 * cannot drift: both of the alternatives tried here were worse.
 * `aria-pressed` on the focused element is dnd-kit's activator marker, but
 * the attribute means "this toggle is on", so the first row control to
 * become a genuine toggle would have switched the arrows off. `useDndContext`
 * says exactly the right thing, but subscribes every row to a context
 * memoised on `collisions` and `over` — recomputed continuously while a drag
 * moves, so every row re-rendered on every pointer move.
 */
let dragActive = false;

/** Called by App's DndContext on drag start, end and cancel. */
export const setRowDragActive = (value: boolean): void => {
  dragActive = value;
};

export const useRowKeys = (): KeyboardEventHandler<HTMLDivElement> =>
  useCallback((event) => {
    if (dragActive) return;

    /*
     * Up leaves the list the way Down entered it.
     *
     * `Down` in the search field puts focus on a row; without this there was
     * no way back — `Shift+Tab` lands on whatever precedes the row in the DOM,
     * not the field, so the list was a one-way trip. Reported from real use
     * within a minute of the shortcut shipping.
     *
     * From **any** row, and from a control inside one, rather than only from
     * the first. Plain arrows are deliberately unbound between rows, so
     * nobody is expecting `Up` to mean "previous row" and there is no
     * competing meaning to displace — where binding it only at the top would
     * make the same key work in some places and silently do nothing in
     * others.
     */
    if (event.key === "ArrowUp") {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const field = document.querySelector<HTMLElement>("[data-search-field]");
      if (!field) return;
      event.preventDefault();
      event.stopPropagation();
      field.focus();
      return;
    }

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

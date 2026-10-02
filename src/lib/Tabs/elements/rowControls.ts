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
 * Spread onto a row's primary action — the one control Tab stops on.
 *
 * Two definitions rather than one with a flag, because the difference is the
 * whole model: the primary action is the row's **fixed** tab stop, and every
 * other control stays at -1 and is reached with Left/Right. Nothing reassigns
 * them. APG's roving tabindex would move the 0 to whichever control was last
 * focused, and SPEC-04 AC-36 forbids exactly that memory — Tab back into a row
 * always lands on its first control, not on the one you left from.
 */
export const rowPrimaryProps = {
  "data-row-control": true,
  tabIndex: 0,
} as const;

/**
 * Where a tab row keeps its own name, without a position (SPEC-04 AM-3).
 *
 * `RowList` reads it and writes the name plus ", n of N" into `aria-label`
 * after commit. One constant for both ends: the row that writes it and the
 * list that reads it agree on nothing else, and a rename on one side alone
 * would stop the numbering with no error anywhere.
 */
export const ROW_LABEL_ATTRIBUTE = "data-row-label";

/**
 * Spread onto a row that `RowList` should number.
 *
 * React writes the base name to `aria-label` as well, so a row outside a
 * `RowList` (the drag overlay, a test rendering it alone) still has one.
 * Inside a list, `RowList` overwrites `aria-label` with the same name plus its
 * position. React rewrites both only when the name changes, and never on a
 * render where it did not, which is what keeps the position.
 */
export const rowLabelProps = (name: string) => ({
  "aria-label": name,
  [ROW_LABEL_ATTRIBUTE]: name,
});

/**
 * The accessible name of a group or window row's chevron — SPEC-04 AC-6, AC-33.
 *
 * A PROPOSAL, to be judged by ear (PLAN-SPEC-04 T-2b, "Open for T-4/T-5"). It
 * is stable on purpose: an APG disclosure button keeps one name and lets
 * `aria-expanded` speak, so a screen reader says "Tabs, button, expanded" and
 * "Tabs, button, collapsed". "Expand"/"Collapse" in the name would say the
 * state twice, and change the name under the user as they press it. The
 * toolbar around it has already said which group or window, so this does not.
 * One definition, so the two rows cannot drift: changing the wording is this
 * line, plus its assertions in the two rows' tests.
 */
export const ROW_CHEVRON_NAME = "Tabs";

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
// Updated 2026-09-30 (SPEC-04 T-2): the tab row is a `role="toolbar"` at
// tabIndex -1 now, so it is never itself the focus-visible element and
// `&:focus-visible` below is unreachable for it. The reveal comes from
// `&:has(:focus-visible)` matching the focused primary button. Left in place
// rather than deleted: removing it is a behaviour claim jsdom cannot check, in
// a file that has had to re-fix this behaviour twice.
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
  // `&:focus-visible .itemAction` is unreachable on a row that is no longer
  // focusable (2026-09-30, SPEC-04 T-2); `&:has(:focus-visible) .itemAction`
  // does the work. See `revealedRow`.
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
  /*
   * The text takes no clicks, and that is not a detail of the mask — it is the
   * price of it.
   *
   * `ListItemText` spans the whole row, controls included; the mask hides its
   * tail but a mask changes *painting*, not hit-testing, and it makes the
   * element a stacking context that tests above the absolutely positioned
   * buttons. Measured at the float's width: of the close button's 37px, **11
   * were clickable** — the icon was drawn in a place the pointer could not
   * reach, which is worse than being hidden.
   *
   * Nothing is lost by refusing the clicks. The text is not interactive, so a
   * click passes through to the row beneath, which activates the tab — exactly
   * what clicking a title should do.
   */
  // Both rules carry both properties on purpose: a computed key beside a
  // literal one makes TypeScript infer a union of their value shapes, which
  // MUI's `sx` then refuses. Same shape, no union. `maskImage: "none"` is the
  // resting state either way.
  "& .MuiListItemText-root": {
    pointerEvents: "none",
    maskImage: "none",
  },
  [revealedRow.map((state) => `${state} .MuiListItemText-root`).join(", ")]: {
    pointerEvents: "none",
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

/**
 * A row while it is being dragged: gone from view, still in the document.
 *
 * It used to be unmounted for the length of the drag. That took the drag
 * handle with it, and the handle is what holds focus during a keyboard drag —
 * so focus fell to the page. Heard with NVDA: "Conscious Tabs, document"
 * straight after picking up, which cut off the announcement of what had been
 * picked up, and the landmark, the list and the row read out again after
 * every drop.
 *
 * Collapsed, not hidden: `display: none` and `visibility: hidden` both drop
 * focus, which is the thing this is here to keep. Height only, so the row's
 * top-left corner stays where it was and dnd-kit has no movement of the
 * dragged node to compensate for.
 */
export const rowWhileDraggedSx = {
  height: "0px",
  minHeight: "0px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
} as const;

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

/**
 * The drag handle that is owed focus after a keyboard drop, and until when.
 *
 * dnd-kit puts focus back on the handle a keyboard drag started from, once.
 * That is enough when the row stays where it is. It is not enough when the
 * drop moves the tab somewhere that rebuilds its row — into a group, out of
 * one, to another window. Chrome then reports the move, the list re-renders,
 * the row mounts again under a different parent, and the handle that had
 * focus is gone. Measured in a browser: focus fell to the document body, and
 * the next arrow press did nothing (SPEC-04 AC-13).
 *
 * So `App` records which row was dropped, and that row's handle takes focus
 * as it mounts. Asked at mount, not subscribed to, for the reason `dragActive`
 * above is a flag: a context would re-render every row.
 *
 * It lapses, because the rebuild either follows the drop within moments or
 * does not happen at all. And a handle only takes focus that nobody holds:
 * if the user has already moved on, it is theirs.
 */
const FOCUS_OWED_MS = 3000;
let focusOwed: { key: string; until: number } | undefined;

/** Called by App when a keyboard drag is dropped. `undefined` clears it. */
export const oweFocusTo = (key: string | undefined): void => {
  focusOwed =
    key === undefined ? undefined : { key, until: Date.now() + FOCUS_OWED_MS };
};

/** Asked by a drag handle as it mounts: is this the row that was dropped? */
export const isOwedFocus = (key: string | undefined): boolean =>
  key !== undefined &&
  focusOwed !== undefined &&
  focusOwed.key === key &&
  Date.now() <= focusOwed.until;

/**
 * The name a row's handle and App agree on for one dragged row.
 *
 * Nothing for a row with no id: a key built from `undefined` would be shared
 * by every such row, and each would think itself owed.
 */
export const dragFocusKey = (
  type: "tab" | "group",
  id: number | undefined,
): string | undefined => (id === undefined ? undefined : `${type}-${id}`);

/**
 * An arrow press with nothing held down.
 *
 * The two halves of one keyboard model — `Down` out of the search field and
 * `Up` back into it — have to agree on what counts as plain, and `App` reads
 * this for its half. A modified arrow belongs to whoever bound it: SPEC-05
 * reserves `Shift`+arrow for extending a selection, and `Ctrl`/`Alt`+arrow are
 * the browser's own.
 */
export const isPlainArrow = (event: {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

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
      if (!isPlainArrow(event)) return;
      const field = document.querySelector<HTMLElement>("[data-search-field]");
      if (!field) return;
      /*
       * Prevented, but deliberately **not** stopped.
       *
       * dnd-kit's KeyboardSensor listens on the owner document, so stopping
       * propagation here would hide the key from it — and the only thing
       * standing between that and a drag whose arrows go dead is `dragActive`
       * above, a flag set by a separate callback. Left/Right can afford to
       * stop, because they only do so once they have found a stop to move to;
       * this branch would stop on every press. Letting it bubble costs
       * nothing — no ancestor of a row handles Up — and means a stale flag
       * degrades to "focus moved as well" rather than "the drag stopped
       * responding".
       */
      event.preventDefault();
      field.focus();
      return;
    }

    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    // Same rule as Up: a modified arrow belongs to whoever bound it. SPEC-05
    // reserves Shift+arrow for selection, and Ctrl/Alt+arrow are the browser's.
    if (!isPlainArrow(event)) return;
    const row = event.currentTarget;
    const stops = [...row.querySelectorAll<HTMLElement>("[data-row-control]")];
    // The row is not a stop: every row is a toolbar at tabIndex -1, which Tab
    // never lands on (SPEC-04 D-9). But -1 is still focusable by a click, and a
    // click on a row's padding leaves focus on the row itself. Found in review:
    // from there the arrows did nothing, so a pointer user who then reached
    // for the keyboard was stuck. The row counts as standing just before its
    // first control — Right enters the walk, Left has nowhere to go.
    const focused = document.activeElement;
    const at = focused === row ? -1 : stops.indexOf(focused as HTMLElement);
    if (at < 0 && focused !== row) return;
    const next = at + (event.key === "ArrowRight" ? 1 : -1);
    if (next < 0 || next >= stops.length) return;
    event.preventDefault();
    event.stopPropagation();
    stops[next].focus();
  }, []);

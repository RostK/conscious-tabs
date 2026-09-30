import {
  Chip,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import {
  ComponentProps,
  FC,
  MouseEventHandler,
  ReactNode,
  useCallback,
} from "react";

import {
  rowControlsSx,
  rowTailReserveSx,
  useRowKeys,
} from "../elements/rowControls.ts";
import { GroupItem } from "../types.ts";

/**
 * What a screen reader says on entering a group row — SPEC-04 AC-29.
 *
 * A PROPOSAL, to be judged by ear the way AM-3's tab-row name was (PLAN-SPEC-04
 * T-2b, "Open for T-4/T-5"): the title once and first, then what kind of row
 * this is, then how much is in it — "Work, group, 3 tabs". Changing the wording
 * after the listen is this one function, plus its assertions in
 * GroupDisplay.test.tsx.
 *
 * Not numbered: AM-3's "n of N" is for tab rows, so this carries no
 * `data-row-label`. Not `Actions for …`, which is the menu button's name in
 * GroupListItem — two controls in one row answering to the same phrase is what
 * AC-29 exists to prevent. A string, never markup: the title is user text.
 */
const toolbarName = (group: GroupItem): string => {
  const count = group.tabs.length;
  return `${group.title || "Untitled"}, group, ${count} tab${count === 1 ? "" : "s"}`;
};

export const GroupDisplay: FC<{
  group: GroupItem;
  pre?: ReactNode;
  itemAction?: ReactNode;
  sx?: ComponentProps<typeof ListItemButton>["sx"];
  onCtrlClick?: MouseEventHandler;
  /**
   * Whether this row's click collapses the group.
   *
   * False where the surface forces groups open — search results — and the
   * point is not that the toggle would be pointless there but that it was
   * *harmful*: `chrome.tabGroups.update` is a change to the browser, and the
   * row would make it while showing nothing. See the click handler.
   */
  collapsible?: boolean;
}> = ({ group, onCtrlClick, itemAction, pre, sx, collapsible = true }) => {
  const rowKeys = useRowKeys();
  const handleClick = useCallback<MouseEventHandler>(
    async (e) => {
      // A modifier click selects, and only selects. Without the return it also
      // fell through to the toggle below, so ctrl-clicking a group to select
      // its tabs collapsed the group out from under the pointer — and
      // ctrl-clicking again to deselect expanded it. TabDisplay has this same
      // branch and has always returned here; the two rows disagreed about what
      // a modifier click means, which is the kind of thing only a diff read or
      // a second pair of eyes catches.
      if (e.ctrlKey || e.metaKey) {
        onCtrlClick?.(e);
        return;
      }
      /*
       * Where the surface forces groups open, this row does not collapse them.
       *
       * It used to, unconditionally. In search results `GroupListItem` passes
       * `expandedGroups`, which renders the group's tabs regardless of
       * `collapsed` and renders no chevron at all — so a click here collapsed
       * the user's real tab group in Chrome and **nothing on screen changed**.
       * The tabs stayed listed, there was no chevron to turn, and they found
       * out later from the tab strip. A control whose only evidence is
       * somewhere else is worse than one that does nothing.
       */
      if (!collapsible) return;
      await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
    },
    [collapsible, group.collapsed, group.id, onCtrlClick],
  );

  return (
    <ListItemButton
      // A toolbar, not a button: the row holds several controls, and a button
      // may not. ButtonBase sets role="button" on a non-button component but
      // spreads its own props after that default, so this wins — asserted in
      // GroupDisplay.test.tsx rather than trusted. tabIndex -1 because the row is
      // never the focus target: the chevron, or in search results the select-all
      // control, is the row's one Tab stop (SPEC-04 D-5). That is also what drops
      // the row from `useRowKeys`'s stops — a row counts as one only while it can
      // hold focus (D-9).
      component="div"
      role="toolbar"
      tabIndex={-1}
      aria-label={toolbarName(group)}
      // The pointer path is unchanged (AC-18): a click anywhere on the row still
      // collapses, and a modifier click still only selects.
      onClick={handleClick}
      onKeyDown={rowKeys}
      sx={[
        { pt: 0.2, pb: 0.2, height: 49.5 },
        {
          boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
        },
        rowControlsSx,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {pre}
      {/* Nothing to show, nothing to render: the drag overlay passes no
          controls, and an empty absolutely-positioned wrapper there was a
          second place to ask "does this row have controls?" — one the chip's
          reservation below could drift away from. */}
      {itemAction && (
        <ListItemSecondaryAction>
          <div className="itemAction">{itemAction}</div>
        </ListItemSecondaryAction>
      )}
      <ListItemText
        primary={
          <Chip
            label={group.title}
            size="small"
            // Chip's own `max-width: 100%` is the whole of this bug: the text
            // box runs to the row's right edge, and so, for a long enough
            // name, did the pill — under the drag handle, the menu and the
            // close button, rounded edge and tint included. A short name never
            // reaches this, which is why it went unnoticed.
            //
            // Why this row reserves where a tab row masks is in
            // `rowTailReserveSx`, along with what the number has to be
            // measured from. 88.3px is the harness reading of this row's
            // secondary action at the float's width; the helper adds the gap.
            //
            // No controls, no reservation — the drag overlay renders this row
            // without any, and reserving there would truncate the name it is
            // dragging for no reason.
            sx={itemAction ? rowTailReserveSx(88.3) : undefined}
            style={{
              backgroundColor: `color-mix(in srgb, ${group.color} 30%, transparent)`,
            }}
          />
        }
      />
    </ListItemButton>
  );
};

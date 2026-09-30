import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
  VolumeOff,
  VolumeUp,
} from "@mui/icons-material";
import {
  ButtonBase,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import { FC, MouseEventHandler, ReactNode, useCallback } from "react";

import { activateTab, closeTab, setMuted } from "../actions.ts";
import { AudioBadge } from "../elements/AudioBadge.tsx";
import { ItemButton } from "../elements/ItemButton.tsx";
import {
  rowControlProps,
  rowControlsSx,
  rowPrimaryProps,
  rowTailMaskSx,
  selectedProps,
  useRowKeys,
} from "../elements/rowControls.ts";
import { TabFavicon } from "../elements/TabFavicon.tsx";
import { useSelected } from "../selection";
import { TabItem } from "../types.ts";

/**
 * Where a tab lives, for the row's name: two tabs with the same title on
 * different sites are still told apart. Text either way and handed to
 * `aria-label` as a string, so it reaches no sink. Two tabs open on the same
 * page still collide — SPEC-04 §8 item 1, not solved here.
 */
const hostOf = (url: string | undefined): string => {
  if (!url) return "";
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
};

export const TabDisplay: FC<{
  tab: TabItem;
  dragHandle?: ReactNode;
}> = ({ tab, dragHandle }) => {
  const { isSelected, switchSelection } = useSelected(tab.id as number);
  const handleActivate = useCallback<MouseEventHandler>(
    (e) => {
      if (!tab.id) return;
      if (e.ctrlKey || e.metaKey) {
        switchSelection();
        return;
      }
      // Was an inline copy of activateTab wrapped in an empty catch, which is
      // how "clicking a tab in the float does nothing" stayed silent: the
      // sidePanel.open() it opened with rejects there, so the activation two
      // lines below never ran and the reason went nowhere.
      void activateTab(tab.id, tab.windowId);
    },
    [switchSelection, tab.id, tab.windowId],
  );
  // The row stays the pointer's click target (AC-18), and the primary button
  // sits inside it, so a click on the title would otherwise fire both. The
  // event is passed on rather than rebuilt: `handleActivate` reads
  // ctrlKey/metaKey from it, and a Ctrl-click that lost its modifier would
  // silently stop selecting.
  const handlePrimary = useCallback<MouseEventHandler>(
    (e) => {
      e.stopPropagation();
      handleActivate(e);
    },
    [handleActivate],
  );
  const handleDelete = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tab.id) {
        void closeTab(tab.id);
      }
    },
    [tab.id],
  );
  const muted = Boolean(tab.mutedInfo?.muted);
  // Only a row with something to mute offers the control. On every other row
  // it would be a button that does nothing, and one more stop on the Left/Right
  // walk — the badge on the favicon is what tells you which rows have it.
  const noisy = muted || Boolean(tab.audible);
  const handleMute = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tab.id) {
        void setMuted(tab.id, !muted);
      }
    },
    [muted, tab.id],
  );
  const handleRowKeys = useRowKeys();

  const handleHighlight = useCallback<MouseEventHandler>(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchSelection();
    },
    [switchSelection],
  );

  // Derived here, from `tab`, and never passed in: a new prop on TabListItem
  // would defeat its row memo (SPEC-04 D-6).
  const host = hostOf(tab.url);
  const toolbarName = host
    ? `${tab.title || "tab"}, ${host}`
    : tab.title || "tab";

  return (
    <ListItemButton
      // A toolbar, not a button: the row holds several controls, and a button
      // may not. ButtonBase sets role="button" on a non-button component, but
      // spreads its own props after that default, so this wins — asserted in
      // TabDisplay.test.tsx rather than trusted, in case an upgrade reverses it.
      component="div"
      role="toolbar"
      // Never focused and not a tab stop: the primary button below is the stop.
      tabIndex={-1}
      aria-label={toolbarName}
      dense
      onClick={handleActivate}
      onKeyDown={handleRowKeys}
      selected={tab.active}
      /* The two widths are measured, not read off MUI's defaults. This
         theme sets typography.fontSize 12, which scales every icon by 12/14,
         so close and mute are 36.6px wide and the drag handle 33.1px rather
         than the 40 and 36 the defaults give — which is how the numbers this
         replaces came to be 6px and 2px too big. The drag handle carries
         edge="end", whose -12px margin comes off the total: drag + close is
         57.7, and 94.3 with mute. Rounded up, so the fade finishes before the
         first icon on either kind of row. */
      sx={[{ pt: 0.2, pb: 0.2 }, rowControlsSx, rowTailMaskSx(noisy ? 96 : 60)]}
    >
      {/* The row's primary action: first in DOM order, so it is the toolbar's
          first control and its one tab stop.

          It carries the markers App reads to land the search field's Down on
          the active tab — marks the row without claiming the caret. The row
          itself is no longer focusable, so they have to sit on something that
          is. Landing here announces the tab, not the toolbar, and Left/Right
          walk on from it. */}
      <ButtonBase
        {...rowPrimaryProps}
        data-tab-row=""
        data-active-tab={tab.active ? "" : undefined}
        aria-label={`Switch to ${tab.title || "tab"}`}
        onClick={handlePrimary}
        sx={{
          flex: 1,
          minWidth: 0,
          justifyContent: "flex-start",
          textAlign: "left",
          p: 0,
        }}
      >
        {/* No top padding. It nudged the favicon down against the first line of
            text, which put its centre ~2.5px below the row's centre line — and
            so below the checkbox and the close button, which are both centred.
            Invisible until the checkbox came to sit over the favicon. */}
        <ListItemAvatar sx={{ minWidth: "36px" }}>
          <AudioBadge audible={tab.audible} muted={tab.mutedInfo?.muted}>
            <TabFavicon
              key={tab.url}
              pageUrl={tab.url}
              browserIcon={tab.favIconUrl}
              size={26}
            />
          </AudioBadge>
        </ListItemAvatar>
        {/* No right padding. It was reserved for the actions, which are
            absolutely positioned — but they are invisible until the row is
            hovered or focused, so at rest every title ellipsised against 58px
            of empty row. `rowTailMaskSx` on the row above takes the tail away
            only while they are actually showing, which costs no layout and so
            cannot reflow the text the way reserving on hover would. */}
        <ListItemText
          primaryTypographyProps={{ noWrap: true }}
          secondaryTypographyProps={{ noWrap: true }}
          primary={tab.title}
          secondary={tab.url?.replace("https://", "")}
        />
      </ButtonBase>
      {/* Beside the favicon, in the row's left padding — not in its slot.
          Selection persists, and a persistent checkbox that took the favicon's
          place would cost the user the one thing that identifies the tab they
          are about to act on. That is what the original -8 was for; the swap
          that replaced it only looked acceptable while hovering.
          The fill is what makes the overlap read as two adjacent controls
          rather than one on top of the other, so this control keeps it even
          though the right-hand actions no longer need it.

          Hidden and revealed by `rowControlsSx` like every other control on
          every other row. It used to carry a second class with its own copy
          of those six selectors, which differed only by omitting
          `:focus-within` — one behaviour with two definitions, in a file
          that has already had to fix that behaviour twice.

          After the primary button in the DOM, so it is the walk's second stop;
          it is absolutely positioned, so where it sits in the markup does not
          move it. */}
      <ItemButton
        className="itemAction"
        {...rowControlProps}
        {...selectedProps(isSelected)}
        onClick={handleHighlight}
        aria-label={`${isSelected ? "Deselect" : "Select"} ${tab.title || "tab"}`}
        sx={{
          position: "absolute",
          /*
           * Flush with the row, not eight pixels past it. At -8 the button's
           * box began outside the viewport — the glyph was fully visible, so
           * nothing looked wrong, while eight of its thirty-seven pixels were
           * unclickable, and at the screen edge where a pointer naturally
           * lands. The icon moves 8px right with it and still sits over the
           * favicon, which is what the z-index below is for.
           */
          left: 0,
          backgroundColor: "background.paper",
          // Above the favicon, not behind it. Both are positioned — this one
          // absolutely, the favicon by the Badge that AudioBadge wraps it in —
          // so at z-index auto they paint in DOM order, and the badge, coming
          // later, took the overlap. The fill then stopped dead at the
          // favicon's edge, and the control read as a flat square jammed
          // against it rather than a round button sitting over the row.
          zIndex: 1,
        }}
      >
        {isSelected ? <CheckBoxOutlined /> : <CheckBoxOutlineBlankOutlined />}
      </ItemButton>
      <ListItemSecondaryAction>
        {noisy && (
          <ItemButton
            onClick={handleMute}
            {...rowControlProps}
            aria-label={`${muted ? "Unmute" : "Mute"} ${tab.title || "tab"}`}
            className="itemAction"
            sx={{ color: muted ? "text.disabled" : "error.main" }}
          >
            {muted ? <VolumeOff /> : <VolumeUp />}
          </ItemButton>
        )}
        <ItemButton
          onClick={handleDelete}
          {...rowControlProps}
          aria-label={`Close ${tab.title || "tab"}`}
          className="itemAction"
        >
          <Close />
        </ItemButton>
        {/* Last, and so the final control in the toolbar (AC-30). It carries
            `edge="end"` — a negative margin on whatever sits flush with the
            row's right edge, which moved here from Close — so the width the
            tail mask reserves is unchanged. TabListItem builds the handle and
            sets that edge on it. */}
        {dragHandle}
      </ListItemSecondaryAction>
    </ListItemButton>
  );
};

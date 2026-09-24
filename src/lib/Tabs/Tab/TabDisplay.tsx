import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
  VolumeOff,
  VolumeUp,
} from "@mui/icons-material";
import {
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
  selectedProps,
  useRowKeys,
} from "../elements/rowControls.ts";
import { TabFavicon } from "../elements/TabFavicon.tsx";
import { useSelected } from "../selection";
import { TabItem } from "../types.ts";

export const TabDisplay: FC<{
  focus?: boolean;
  tab: TabItem;
  dragHandle?: ReactNode;
}> = ({ tab, focus = true, dragHandle }) => {
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

  return (
    <ListItemButton
      dense
      onClick={handleActivate}
      onKeyDown={handleRowKeys}
      selected={tab.active}
      /* The rule guards against autofocus on load stealing a screen
         reader's place in the document. This is the opposite: it puts
         focus on the row for the tab the user is already looking at, so
         the keyboard starts where they are rather than at the top of a
         list of eighty. */
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={tab.active && focus}
      sx={[{ pt: 0.2, pb: 0.2 }, rowControlsSx]}
    >
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
          that has already had to fix that behaviour twice. */}
      <ItemButton
        className="itemAction"
        {...rowControlProps}
        {...selectedProps(isSelected)}
        onClick={handleHighlight}
        aria-label={isSelected ? "Deselect tab" : "Select tab"}
        sx={{
          position: "absolute",
          left: -8,
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
      {/* No top padding. It nudged the favicon down against the first line of
          text, which put its centre ~2.5px below the row's centre line — and
          so below the checkbox and the close button, which are both centred.
          Invisible until the checkbox came to sit over the favicon. */}
      <ListItemAvatar sx={{ minWidth: "36px" }}>
        <AudioBadge audible={tab.audible} muted={tab.mutedInfo?.muted}>
          <TabFavicon key={tab.url} pageUrl={tab.url} size={26} />
        </AudioBadge>
      </ListItemAvatar>
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
        {dragHandle}
        <ItemButton
          onClick={handleDelete}
          edge="end"
          {...rowControlProps}
          aria-label={`Close ${tab.title || "tab"}`}
          className="itemAction"
        >
          <Close />
        </ItemButton>
      </ListItemSecondaryAction>
      <ListItemText
        // The actions are absolutely positioned, so without this the title
        // runs underneath them and they need an opaque fill to stay legible —
        // which is what made them look like patches on a hovered row. Reserved
        // permanently rather than on hover, so revealing them never reflows
        // the text.
        sx={{ pr: noisy ? "96px" : "64px" }}
        primaryTypographyProps={{ noWrap: true }}
        secondaryTypographyProps={{ noWrap: true }}
        primary={tab.title}
        secondary={tab.url?.replace("https://", "")}
      />
    </ListItemButton>
  );
};

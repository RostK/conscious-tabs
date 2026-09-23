import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
} from "@mui/icons-material";
import {
  Box,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import {
  FC,
  MouseEventHandler,
  ReactNode,
  useCallback,
} from "react";

import { activateTab, closeTab } from "../actions.ts";
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
      autoFocus={tab.active && focus}
      sx={[
        { pt: 0.2, pb: 0.2 },
        rowControlsSx,
        {
          // Hidden with opacity, not visibility.
          //
          // visibility: hidden also removes an element from the focus order —
          // not just from Tab, but from focus() entirely — so the Left/Right
          // roving below could not move onto a control that had not already
          // been revealed some other way. It failed silently, which is the
          // worst way for it to fail.
          //
          // opacity keeps them focusable while invisible; tabIndex -1 keeps
          // them out of Tab; pointer-events stops the mouse hitting what it
          // cannot see. Focusing one reveals it, so arrowing along a row
          // lights up each control as it arrives.
          //
          // :focus-visible rather than :focus-within for the row itself,
          // because the active tab's row carries autoFocus — any plain focus
          // rule would leave that one row wearing its controls permanently.
          "& .tabSelect": { opacity: 0, pointerEvents: "none" },
          [[
            "&:hover .tabSelect",
            "&:focus-visible .tabSelect",
            "&:has(:focus-visible) .tabSelect",
            "& .tabSelect:focus",
            // Checked is state, and state outlives the pointer. Needs the
            // attribute selector to outrank the rule above; setting opacity on
            // the button itself loses on specificity, which is why a selected
            // tab's box used to vanish the moment the mouse left.
            "& .tabSelect[data-selected]",
          ].join(", ")]: {
            opacity: 1,
            pointerEvents: "auto",
          },
        },
      ]}
    >
      <ListItemAvatar sx={{ minWidth: "36px", pt: "5px" }}>
        {/* The checkbox centres on *this* box, which is exactly the favicon.
            Centring it on the avatar slot instead needed hand-tuned offsets,
            and those silently stopped being right every time anything around
            them moved — which happened three times. */}
        <Box
          sx={{
            position: "relative",
            display: "inline-flex",
            // Sized to the favicon, not to its contents: AudioBadge's badge
            // hangs off the corner and widened the box, which pulled the
            // centre — and so the checkbox — several pixels to the left.
            width: 26,
            height: 26,
          }}
        >
          <AudioBadge audible={tab.audible} muted={tab.mutedInfo?.muted}>
            <TabFavicon key={tab.favIconUrl} src={tab.favIconUrl} size={26} />
          </AudioBadge>
          {/* Over the favicon, framing it — not beside it, and not instead of
              it. Beside crammed two icons into 16px of padding and read as
              clutter; instead of cost a selected row the one thing that
              identifies the tab, because selection persists. No fill, so the
              favicon stays legible inside the box. */}
          <ItemButton
            className="tabSelect"
            {...rowControlProps}
            {...selectedProps(isSelected)}
            onClick={handleHighlight}
            aria-label={isSelected ? "Deselect tab" : "Select tab"}
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              // Offset up and left rather than dead centre, so the favicon
              // stays readable past the box's lower-right corner. Centred, the
              // box sits squarely on it and the two fight.
              transform: "translate(calc(-50% - 4px), calc(-50% - 4px))",
            }}
          >
            {isSelected ? (
              <CheckBoxOutlined />
            ) : (
              <CheckBoxOutlineBlankOutlined />
            )}
          </ItemButton>
        </Box>
      </ListItemAvatar>
      <ListItemSecondaryAction>
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
        sx={{ pr: "64px" }}
        primaryTypographyProps={{ noWrap: true }}
        secondaryTypographyProps={{ noWrap: true }}
        primary={tab.title}
        secondary={tab.url?.replace("https://", "")}
      />
    </ListItemButton>
  );
};

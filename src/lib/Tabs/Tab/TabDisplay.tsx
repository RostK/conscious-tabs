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
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
} from "react";

import { activateTab, closeTab } from "../actions.ts";
import { AudioBadge } from "../elements/AudioBadge.tsx";
import { ItemButton } from "../elements/ItemButton.tsx";
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
  /**
   * Arrow keys move within a row; Tab moves between them.
   *
   * Making the row's controls focusable (so a keyboard user could reach select
   * and close at all) turned every row into four tab stops — eighty in a list
   * of twenty tabs, just to walk past them. This is the usual answer: one stop
   * per row, and the controls inside reached with Left/Right.
   *
   * Safe to own the arrow keys here. dnd-kit uses them during a keyboard drag,
   * but TabListItem unmounts the row while it is dragging, so this handler
   * does not exist then.
   */
  const handleRowKeys = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const row = e.currentTarget;
      const stops = [
        row,
        ...row.querySelectorAll<HTMLElement>("[data-row-control]"),
      ];
      const at = stops.indexOf(document.activeElement as HTMLElement);
      if (at < 0) return;
      const next = at + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0 || next >= stops.length) return;
      e.preventDefault();
      e.stopPropagation();
      stops[next].focus();
    },
    [],
  );

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
        {
          // Revealed on hover, or on *keyboard* focus. Keyboard focus never
          // triggers :hover, so tabbing through the list used to reach rows
          // whose select and close controls stayed invisible — and a
          // visibility:hidden element is not focusable, so they were not just
          // unseen but unreachable.
          //
          // :focus-visible rather than :focus-within, because the active
          // tab's row carries autoFocus: any focus-based rule would match it
          // permanently and leave one row wearing its controls at all times.
          // :focus-visible is exactly the distinction wanted — a keyboard user
          // is here, rather than focus merely having been placed.
          [[
            "&:hover .itemAction",
            "&:focus-visible .itemAction",
            "&:has(:focus-visible) .itemAction",
          ].join(", ")]: {
            visibility: "visible",
          },
          "& .itemAction": {
            visibility: "hidden",
          },
          // The checkbox takes the favicon's square rather than sitting on top
          // of it. It used to be absolutely positioned at left:-8, which put it
          // over the avatar — survivable in a wide window, plainly broken at
          // the float's 400px, where there is no margin to hang it in.
          [[
            "&:hover .tabIcon",
            "&:focus-visible .tabIcon",
            "&:has(:focus-visible) .tabIcon",
          ].join(", ")]: {
            visibility: "hidden",
          },
          [[
            "&:hover .tabSelect",
            "&:focus-visible .tabSelect",
            "&:has(:focus-visible) .tabSelect",
          ].join(", ")]: {
            visibility: "visible",
          },
        },
      ]}
    >
      <ListItemAvatar
        sx={{ minWidth: "36px", pt: "5px", position: "relative" }}
      >
        <Box
          className="tabIcon"
          sx={{ visibility: isSelected ? "hidden" : "visible" }}
        >
          <AudioBadge audible={tab.audible} muted={tab.mutedInfo?.muted}>
            <TabFavicon key={tab.favIconUrl} src={tab.favIconUrl} size={26} />
          </AudioBadge>
        </Box>
        <ItemButton
          className="tabSelect"
          data-row-control
          tabIndex={-1}
          onClick={handleHighlight}
          aria-label={isSelected ? "Deselect tab" : "Select tab"}
          sx={{
            // Concentric with the favicon it replaces — measured, not
            // guessed: a 37px button over a 26px icon needs these exact
            // offsets or the swap visibly jumps on hover.
            position: "absolute",
            top: -1,
            left: -5.5,
            visibility: isSelected ? "visible" : "hidden",
          }}
        >
          {isSelected ? <CheckBoxOutlined /> : <CheckBoxOutlineBlankOutlined />}
        </ItemButton>
      </ListItemAvatar>
      <ListItemSecondaryAction>
        {dragHandle}
        <ItemButton
          onClick={handleDelete}
          edge="end"
          data-row-control
          tabIndex={-1}
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

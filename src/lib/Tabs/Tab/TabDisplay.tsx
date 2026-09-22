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
import { FC, MouseEventHandler, useCallback } from "react";

import { activateTab, closeTab } from "../actions.ts";
import { AudioBadge } from "../elements/AudioBadge.tsx";
import { ItemButton } from "../elements/ItemButton.tsx";
import { TabFavicon } from "../elements/TabFavicon.tsx";
import { useSelected } from "../selection";
import { TabItem } from "../types.ts";

export const TabDisplay: FC<{ focus?: boolean; tab: TabItem }> = ({
  tab,
  focus = true,
}) => {
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
      selected={tab.active}
      autoFocus={tab.active && focus}
      sx={[
        { pt: 0.2, pb: 0.2 },
        {
          "&:hover .itemAction": {
            visibility: "visible",
          },
          "& .itemAction": {
            visibility: "hidden",
          },
          // The checkbox takes the favicon's square rather than sitting on top
          // of it. It used to be absolutely positioned at left:-8, which put it
          // over the avatar — survivable in a wide window, plainly broken at
          // the float's 400px, where there is no margin to hang it in.
          "&:hover .tabIcon": {
            visibility: "hidden",
          },
          "&:hover .tabSelect": {
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
          onClick={handleHighlight}
          aria-label={isSelected ? "Deselect tab" : "Select tab"}
          sx={{
            position: "absolute",
            top: -3,
            left: -7,
            visibility: isSelected ? "visible" : "hidden",
          }}
        >
          {isSelected ? <CheckBoxOutlined /> : <CheckBoxOutlineBlankOutlined />}
        </ItemButton>
      </ListItemAvatar>
      <ListItemSecondaryAction>
        <ItemButton
          onClick={handleDelete}
          edge="end"
          aria-label="delete"
          className="itemAction"
        >
          <Close />
        </ItemButton>
      </ListItemSecondaryAction>
      <ListItemText
        primaryTypographyProps={{ noWrap: true }}
        secondaryTypographyProps={{ noWrap: true }}
        primary={tab.title}
        secondary={tab.url?.replace("https://", "")}
      />
    </ListItemButton>
  );
};

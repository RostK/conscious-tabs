import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
} from "@mui/icons-material";
import {
  IconButton,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import { FC, MouseEventHandler, useCallback } from "react";

import { promptUndo } from "../../promptUndo.tsx";
import { useSelected } from "../selection";
import { TabItem } from "../types.ts";

export const TabDisplay: FC<{ focus?: boolean; tab: TabItem }> = ({
  tab,
  focus = true,
}) => {
  const { isSelected, switchSelection } = useSelected(tab.id as number);
  const handleActivate = useCallback<MouseEventHandler>(
    async (e) => {
      if (tab.id) {
        if (e.ctrlKey) {
          switchSelection();
        } else {
          try {
            await chrome.sidePanel.open({ windowId: tab.windowId });
            await chrome.tabs.update(tab.id, { active: true });
            await chrome.windows.update(tab.windowId, { focused: true });
          } catch (e) {
            /* empty */
          }
        }
      }
    },
    [switchSelection, tab.id, tab.windowId],
  );
  const handleDelete = useCallback<MouseEventHandler>(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tab.id) {
        try {
          await chrome.tabs.remove(tab.id);
          promptUndo("Tab is closed");
        } catch (e) {
          /* empty */
        }
      }
    },
    [tab],
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
        {
          [`&:hover .itemAction`]: {
            visibility: "visible",
          },
          [`& .itemAction`]: {
            visibility: "hidden",
            backgroundColor: "white",
          },
          [`& .itemAction:hover`]: {
            backgroundColor: "rgb(199,199,199)",
          },
        },
      ]}
    >
      <IconButton
        onClick={handleHighlight}
        className={!isSelected ? "itemAction" : undefined}
        sx={{
          position: "absolute",
          left: -8,
          backgroundColor: "white",
          ["&:hover"]: {
            backgroundColor: "rgb(199,199,199)",
          },
        }}
      >
        {isSelected ? <CheckBoxOutlined /> : <CheckBoxOutlineBlankOutlined />}
      </IconButton>
      <ListItemAvatar style={{ minWidth: "32px" }}>
        <img src={tab.favIconUrl} width={24} />
      </ListItemAvatar>
      <ListItemSecondaryAction>
        <IconButton
          onClick={handleDelete}
          edge="end"
          aria-label="delete"
          className="itemAction"
        >
          <Close />
        </IconButton>
      </ListItemSecondaryAction>
      <ListItemText
        primaryTypographyProps={{ noWrap: true }}
        secondaryTypographyProps={{ noWrap: true }}
        primary={tab.title}
        secondary={tab.url}
      />
    </ListItemButton>
  );
};

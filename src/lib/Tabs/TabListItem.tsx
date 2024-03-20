import { FC, MouseEventHandler, useCallback } from "react";
import {
  IconButton,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { TabItem } from "./types.ts";
import { promptUndo } from "../promptUndo.tsx";

export const TabListItem: FC<{ focus?: boolean; tab: TabItem }> = ({
  tab,
  focus = true,
}) => {
  const handleActivate = useCallback(async () => {
    if (tab.id) {
      try {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
      } catch (e) {
        /* empty */
      }
    }
  }, [tab]);
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

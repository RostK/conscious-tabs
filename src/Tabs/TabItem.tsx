import { FC, useCallback } from "react";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";

export const TabItem: FC<{ tab: TabItem }> = ({ tab }) => {
  const handleActivate = useCallback(async () => {
    if (tab.id) {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  }, [tab]);

  return (
    <ListItemButton
      dense
      onClick={handleActivate}
      selected={tab.active}
      autoFocus={tab.active}
    >
      <ListItemAvatar style={{ paddingRight: "1rem", minWidth: "32px" }}>
        <img src={tab.favIconUrl} width={24} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{ noWrap: true }}
        secondaryTypographyProps={{ noWrap: true }}
        primary={tab.title}
        secondary={tab.url}
      />
    </ListItemButton>
  );
};

import { FC, useCallback } from "react";
import {
  Chip,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { TabItem } from "./TabItem.tsx";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const GroupItem: FC<{ group: GroupItem }> = ({ group }) => {
  const handleClick = useCallback(async () => {
    await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
  }, [group]);

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        style={{
          borderLeft: `.3rem solid color-mix(in srgb, ${group.color} 60%, transparent`,
        }}
      >
        <ListItemText
          primary={
            <Chip
              label={group.title}
              size="small"
              style={{
                backgroundColor: `color-mix(in srgb, ${group.color} 30%, transparent`,
              }}
            />
          }
        />
        {!group.collapsed ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse
        in={!group.collapsed}
        timeout="auto"
        unmountOnExit
        style={{
          borderLeft: `.3rem solid color-mix(in srgb, ${group.color} 60%, transparent`,
          paddingLeft: ".2rem",
        }}
      >
        <List>
          {group.tabs.map((tab) => (
            <TabItem tab={tab} key={tab.id} />
          ))}
        </List>
      </Collapse>
    </>
  );
};

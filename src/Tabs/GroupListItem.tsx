import { FC, useCallback } from "react";
import { Chip, IconButton, ListItemButton, ListItemText } from "@mui/material";
import { TabListItem } from "./TabListItem.tsx";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { GroupItem } from "./types.ts";
import Grid from "@mui/material/Unstable_Grid2";

export const GroupListItem: FC<{ group: GroupItem }> = ({ group }) => {
  const handleClick = useCallback(async () => {
    await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
  }, [group]);

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        style={{
          boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${group.color} 15%, transparent`,
        }}
      >
        <IconButton edge="start">
          {!group.collapsed ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
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
      </ListItemButton>
      {!group.collapsed &&
        group.tabs.map((tab) => (
          <Grid
            xs={12}
            sm={6}
            md={4}
            key={tab.id}
            sx={{
              width: "100%",
            }}
            style={{
              backgroundColor: `color-mix(in srgb, ${group.color} 15%, transparent`,
            }}
          >
            <TabListItem tab={tab} key={tab.id} />
          </Grid>
        ))}
    </>
  );
};

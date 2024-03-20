import { FC, MouseEventHandler, useCallback, useState } from "react";
import {
  Chip,
  IconButton,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { TabListItem } from "./TabListItem.tsx";
import { Close, ExpandLess, ExpandMore, MoreVert } from "@mui/icons-material";
import { GroupItem } from "./types.ts";
import Grid from "@mui/material/Unstable_Grid2";

export const GroupListItem: FC<{ expanded?: boolean; group: GroupItem }> = ({
  group,
  expanded,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpenMenuClick: MouseEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleClick = useCallback(async () => {
    await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
  }, [group]);
  const handleDelete = useCallback<MouseEventHandler>(async () => {
    const tabIds = group.tabs
      .map((tab) => tab.id)
      .filter((id) => id !== undefined) as number[];
    try {
      await chrome.tabs.remove(tabIds);
    } catch (e) {
      /* empty */
    }
  }, [group]);
  const handleUngroup = useCallback<MouseEventHandler>(async () => {
    const tabIds = group.tabs
      .map((tab) => tab.id)
      .filter((id) => id !== undefined) as number[];
    try {
      await chrome.tabs.ungroup(tabIds);
    } catch (e) {
      /* empty */
    }
    handleMenuClose();
  }, [group]);

  return (
    <>
      <Grid xs={12} sm={6} md={4} sx={{ width: "100%" }}>
        <ListItemButton
          onClick={handleClick}
          style={{
            boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${group.color} 15%, transparent`,
          }}
          sx={[
            {
              [`&:hover .itemAction`]: {
                visibility: "visible",
              },
              [`& .itemAction`]: {
                visibility: "hidden",
              },
              [`& .itemAction .close-button`]: {
                bgcolor: `color-mix(in srgb, white 80%, transparent)`,
                ["&: hover"]: { bgcolor: "rgb(199, 199, 199)" },
              },
            },
            open && {
              [`& .itemAction`]: {
                visibility: "visible",
              },
            },
          ]}
        >
          {expanded === undefined && (
            <IconButton edge="start">
              {!group.collapsed ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
          <ListItemSecondaryAction>
            {expanded === undefined && (
              <div className="itemAction">
                <IconButton
                  onClick={handleOpenMenuClick}
                  aria-label="delete"
                  size="small"
                >
                  <MoreVert />
                </IconButton>
                <Menu
                  id="basic-menu"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  MenuListProps={{
                    "aria-labelledby": "basic-button",
                  }}
                  sx={{ padding: 0 }}
                >
                  <MenuItem dense onClick={handleUngroup}>
                    Ungroup all tabs
                  </MenuItem>
                </Menu>
                <IconButton
                  className="close-button"
                  onClick={handleDelete}
                  edge="end"
                  aria-label="delete"
                >
                  <Close />
                </IconButton>
              </div>
            )}
          </ListItemSecondaryAction>
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
      </Grid>
      {(!group.collapsed || expanded) &&
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

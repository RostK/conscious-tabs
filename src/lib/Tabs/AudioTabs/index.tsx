import { VolumeOff, VolumeUp } from "@mui/icons-material";
import {
  Badge,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { FC, useState } from "react";

import { activateTab, setMuted } from "../actions.ts";
import { TabFavicon } from "../elements/TabFavicon.tsx";
import { useAudioTabs } from "../useAudioTabs.ts";

/**
 * A speaker control in the toolbar that appears only when other tabs are
 * making sound. Its badge shows the count; the popover lets you jump to a
 * noisy tab or mute it (individually or all at once).
 */
export const AudioTabs: FC = () => {
  const audioTabs = useAudioTabs();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  if (audioTabs.length === 0) {
    return null;
  }

  const allMuted = audioTabs.every((tab) => tab.mutedInfo?.muted);

  const toggleAll = () => {
    audioTabs.forEach((tab) => {
      if (tab.id !== undefined) {
        setMuted(tab.id, !allMuted);
      }
    });
    close();
  };

  return (
    <>
      <Tooltip title="Tabs playing sound">
        <IconButton
          color="inherit"
          aria-label="tabs playing sound"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          {/* error.dark rather than the default error.main: on dark the
              main tone is lightened, and white on it measured 3.68:1 against
              a 4.5 requirement for text this small. The dark tone reads in
              both themes and is still unmistakably the alarm colour. */}
          <Badge
            badgeContent={audioTabs.length}
            color="error"
            sx={{ "& .MuiBadge-badge": { bgcolor: "error.dark" } }}
          >
            {allMuted ? <VolumeOff /> : <VolumeUp />}
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={toggleAll}>
          <ListItemIcon>
            {allMuted ? (
              <VolumeUp fontSize="small" />
            ) : (
              <VolumeOff fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{allMuted ? "Unmute all" : "Mute all"}</ListItemText>
        </MenuItem>
        <Divider />
        {audioTabs.map((tab) => {
          const muted = Boolean(tab.mutedInfo?.muted);
          return (
            <MenuItem
              key={tab.id}
              onClick={() => {
                if (tab.id !== undefined) {
                  activateTab(tab.id, tab.windowId);
                }
                close();
              }}
              sx={{ maxWidth: 320 }}
            >
              <ListItemIcon>
                <TabFavicon
                  key={tab.favIconUrl}
                  src={tab.favIconUrl}
                  size={20}
                />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ noWrap: true }}
                sx={{ mr: 1 }}
              >
                {tab.title || tab.url}
              </ListItemText>
              <Tooltip title={muted ? "Unmute" : "Mute"}>
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tab.id !== undefined) {
                      setMuted(tab.id, !muted);
                    }
                  }}
                >
                  {muted ? (
                    <VolumeOff fontSize="small" />
                  ) : (
                    <VolumeUp fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

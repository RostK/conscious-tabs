import { useDraggable } from "@dnd-kit/core";
import {
  Close,
  ContentCopy,
  DragIndicator,
  MoreVert,
  OpenInNew,
  PushPin,
  PushPinOutlined,
  Refresh,
  VolumeOff,
  VolumeUp,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { FC, useState } from "react";

import {
  closeTab,
  duplicateTab,
  hardReloadTab,
  moveTabToNewWindow,
  setMuted,
  setPinned,
} from "../actions.ts";
import { TabFavicon } from "../elements/TabFavicon.tsx";
import { useActiveTab } from "../useActiveTab.ts";

/**
 * A persistent "you are here" card for the active tab of this side panel's
 * window, with quick actions so the current tab can be closed (and managed)
 * without hunting through the list.
 */
export const CurrentTab: FC = () => {
  const tab = useActiveTab();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `current-tab-${tab?.id ?? "none"}`,
    data: tab,
  });
  const closeMenu = () => setMenuAnchor(null);

  if (!tab?.id) {
    return null;
  }
  const id = tab.id;
  const muted = Boolean(tab.mutedInfo?.muted);
  const showMute = muted || Boolean(tab.audible);

  const fromMenu = (action: () => void) => () => {
    action();
    closeMenu();
  };

  return (
    <Box sx={{ bgcolor: "background.paper", color: "text.primary" }}>
      <Divider />
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          // A restrained plum "you are here" cue: brand accent bar + faint
          // tint, keeping the row itself dense and unchanged otherwise.
          borderLeft: 3,
          borderColor: "primary.main",
          bgcolor: (theme) =>
            `color-mix(in srgb, ${theme.palette.primary.main} 6%, transparent)`,
          pl: 0.75,
          pr: 1,
          py: 0.5,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <DragIndicator
          fontSize="small"
          sx={{ color: "text.disabled", flexShrink: 0 }}
        />
        <Box sx={{ display: "flex", flexShrink: 0 }}>
          <TabFavicon key={tab.favIconUrl} src={tab.favIconUrl} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0, mx: 0.5 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {tab.title || "Current tab"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            noWrap
          >
            {tab.url?.replace(/^https?:\/\//, "")}
          </Typography>
        </Box>
        {showMute && (
          <Tooltip title={muted ? "Unmute" : "Mute"}>
            <IconButton size="small" onClick={() => setMuted(id, !muted)}>
              {muted ? (
                <VolumeOff fontSize="small" />
              ) : (
                <VolumeUp fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Close tab">
          <IconButton size="small" onClick={() => closeTab(id)}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="More actions">
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        <MenuItem onClick={fromMenu(() => moveTabToNewWindow(id))}>
          <ListItemIcon>
            <OpenInNew fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move to new window</ListItemText>
        </MenuItem>
        <MenuItem onClick={fromMenu(() => setPinned(id, !tab.pinned))}>
          <ListItemIcon>
            {tab.pinned ? (
              <PushPinOutlined fontSize="small" />
            ) : (
              <PushPin fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{tab.pinned ? "Unpin tab" : "Pin tab"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={fromMenu(() => duplicateTab(id))}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate tab</ListItemText>
        </MenuItem>
        <MenuItem onClick={fromMenu(() => hardReloadTab(id))}>
          <ListItemIcon>
            <Refresh fontSize="small" />
          </ListItemIcon>
          <ListItemText>Hard reload</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

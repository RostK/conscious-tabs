import { useDraggable } from "@dnd-kit/core";
import {
  Close,
  ContentCopy,
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
import {
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  useState,
} from "react";

import {
  closeTab,
  duplicateTab,
  hardReloadTab,
  moveTabToNewWindow,
  setMuted,
  setPinned,
} from "../actions.ts";
import { AudioBadge } from "../elements/AudioBadge.tsx";
import { DragHandle } from "../elements/DragHandle.tsx";
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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } =
    useDraggable({
      id: `current-tab-${tab?.id ?? "none"}`,
      data: tab,
    });
  // See DragHandle: the mouse half stays on the card so it drags from
  // anywhere, the keyboard half moves to the grip, which stops this card
  // being an unlabelled tab stop that announces only "draggable".
  const onMouseDown = listeners?.onMouseDown as
    | MouseEventHandler<HTMLDivElement>
    | undefined;
  const onKeyDown = listeners?.onKeyDown as KeyboardEventHandler | undefined;
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
        onMouseDown={onMouseDown}
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
          // Lands the favicon on the same x as every row's (their
          // ListItemButton pads 16px; the accent bar here is 3 of it). The
          // grip used to sit in front of the favicon, which made matching
          // them impossible — it is with the other actions now.
          pl: "13px",
          pr: 1,
          py: 0.5,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        {/* Same column the rows give their favicon: 13px padding plus the 3px
            accent bar starts it at 16, and 32 + the 4px gap puts the title at
            52. Both then sit on exactly the x every row below uses, which is
            the only way to line the card up with the list — matching one of
            the two by eye always threw the other out. */}
        <Box sx={{ display: "flex", flexShrink: 0, width: "32px" }}>
          <AudioBadge audible={tab.audible} muted={muted}>
            <TabFavicon key={tab.favIconUrl} src={tab.favIconUrl} />
          </AudioBadge>
        </Box>
        {/* Right margin only: a left one would push the title 4px past the
            column the rows put theirs in. */}
        <Box sx={{ flexGrow: 1, minWidth: 0, mr: 0.5 }}>
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
            <IconButton
              size="small"
              color={muted ? "default" : "error"}
              onClick={() => setMuted(id, !muted)}
            >
              {muted ? (
                <VolumeOff fontSize="small" />
              ) : (
                <VolumeUp fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        <DragHandle
          label="Reorder the current tab"
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          onKeyDown={onKeyDown}
          // This card has no hover-reveal rule, so the default class would
          // hide the grip permanently.
          className={undefined}
          sx={{ color: "text.disabled" }}
        />
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

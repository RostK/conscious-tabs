import {
  OpenInNew,
  PictureInPictureAlt,
  PictureInPictureAltOutlined,
  TabUnselected,
  VerticalSplit,
  WebAsset,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { FC, useContext, useState, useSyncExternalStore } from "react";

import {
  backToSidePanel,
  closeIfSidePanel,
  openAnchorTab,
  useSelfTab,
} from "../anchor";
import {
  canFloat,
  closeFloat,
  getFloatState,
  openFloat,
  subscribeFloat,
} from "../float";
import { getHost } from "../host";
import { SelectionContext, SelectionToolbar } from "../Tabs/selection";
import logo from "./logo.svg";

const handleNewWindow = async () => {
  const { id } = await chrome.windows.create({ focused: true });
  if (id) {
    await chrome.sidePanel.open({ windowId: id });
  }
};

const handleNewTab = async () => {
  await chrome.tabs.create({ active: true });
};

/**
 * Hand off to the anchor tab. From the side panel this is a move, not a copy:
 * the panel closes itself behind us so the user is never looking at two live
 * copies of the same list.
 */
const handleAnchor = async () => {
  await openAnchorTab();
  await closeIfSidePanel();
};

/**
 * Every "which surface am I on" action lives behind the logo.
 *
 * The bar cannot fit a third labelled button at side-panel width — three of
 * them wrapped onto two lines each — and a tooltip is no substitute: it needs
 * a hover, so it never reaches keyboard or touch users at all. Menu items are
 * real text, read by screen readers and reachable by keyboard, and the logo
 * was already sitting there, so this costs no width.
 */
export const ControlBar: FC = () => {
  const { selected } = useContext(SelectionContext);
  const host = getHost();
  const self = useSelfTab();
  const floating =
    useSyncExternalStore(subscribeFloat, getFloatState) === "open";

  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const closeMenu = () => {
    setMenu(null);
  };

  return (
    <>
      <Toolbar sx={{ visibility: "hidden" }} />
      {Boolean(selected.length) && (
        <Toolbar sx={{ visibility: "hidden", height: "75px" }} />
      )}
      <AppBar
        position="fixed"
        sx={{
          top: "auto",
          bottom: 0,
          backgroundColor: "background.paper",
          maxWidth: "1024px",
          m: "0 auto",
          right: "initial",
          left: "initial",
        }}
      >
        <SelectionToolbar />
        <Divider />
        <Toolbar>
          <Tooltip title="Where to show Conscious Tabs">
            <IconButton
              aria-label="Where to show Conscious Tabs"
              aria-haspopup="menu"
              onClick={(e) => {
                setMenu(e.currentTarget);
              }}
            >
              <img src={logo} alt="" />
            </IconButton>
          </Tooltip>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              gap: 0.5,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <Tooltip title="New tab">
              <IconButton aria-label="New tab" onClick={handleNewTab}>
                <TabUnselected />
              </IconButton>
            </Tooltip>
            <Tooltip title="New window">
              <IconButton aria-label="New window" onClick={handleNewWindow}>
                <WebAsset />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={menu} open={Boolean(menu)} onClose={closeMenu}>
        {host === "panel" && (
          <MenuItem
            onClick={() => {
              void handleAnchor();
              closeMenu();
            }}
          >
            <ListItemIcon>
              <OpenInNew fontSize="small" />
            </ListItemIcon>
            {/* The secondary line is the whole discovery mechanism. Floating
                cannot be started from the side panel at all — Chrome refuses
                Picture-in-Picture outside a real tab — so naming it on a
                control that only opens the tab would be a promise this click
                does not keep. */}
            <ListItemText
              primary="Open in a tab"
              secondary="Where it can float on top of other apps"
            />
          </MenuItem>
        )}

        {host === "anchor" && floating && (
          <MenuItem
            onClick={() => {
              closeFloat();
              closeMenu();
            }}
          >
            <ListItemIcon>
              <PictureInPictureAltOutlined fontSize="small" />
            </ListItemIcon>
            {/* Names what it destroys, not where it lands. */}
            <ListItemText primary="Stop floating" />
          </MenuItem>
        )}

        {host === "anchor" && !floating && canFloat() && (
          <MenuItem
            onClick={() => {
              // Called before anything else in the handler: requestWindow()
              // needs this click's transient activation, and closing the menu
              // first would be one step too many.
              openFloat();
              closeMenu();
            }}
          >
            <ListItemIcon>
              <PictureInPictureAlt fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Float on top" />
          </MenuItem>
        )}

        {host === "anchor" && !floating && self && (
          <MenuItem
            onClick={() => {
              // sidePanel.open() needs the gesture too, so this also goes
              // first. The windowId was captured at mount for the same reason.
              backToSidePanel(self);
              closeMenu();
            }}
          >
            <ListItemIcon>
              <VerticalSplit fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Back to panel"
              secondary="Closes this tab"
            />
          </MenuItem>
        )}

        {host === "float" && (
          <MenuItem disabled>
            <ListItemText primary="Floating" secondary="Use the tab behind" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

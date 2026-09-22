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
  Button,
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
 * The surface controls are laid out differently per host, on purpose.
 *
 * The side panel is ~320px wide and could not fit a third labelled button —
 * three of them wrapped onto two lines each — so its one surface action hides
 * behind the logo, where a menu item's secondary line can carry the
 * explanation that a tooltip could not (a tooltip needs a hover, so keyboard
 * and touch users never see it).
 *
 * The anchor tab has a whole browser window. Hiding two plainly-named actions
 * in a menu there buys nothing and costs a click.
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
        <Toolbar sx={{ gap: 0.5 }}>
          {host === "panel" ? (
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
          ) : (
            <Box
              component="img"
              src={logo}
              alt=""
              sx={{ width: 32, height: 32, flexShrink: 0, mx: 0.5 }}
            />
          )}

          {host === "anchor" && floating && (
            <Button
              startIcon={<PictureInPictureAltOutlined />}
              onClick={closeFloat}
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              {/* Names what it destroys, not where it lands. */}
              Stop floating
            </Button>
          )}
          {host === "anchor" && !floating && canFloat() && (
            /* Direct handler: requestWindow() needs this click's transient
               activation, so nothing may await before it. */
            <Button
              startIcon={<PictureInPictureAlt />}
              onClick={openFloat}
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Float on top
            </Button>
          )}
          {host === "anchor" && !floating && self && (
            /* Hidden while floating: this closes the anchor tab, and the float
               cannot outlive it. sidePanel.open() needs the gesture too, which
               is why windowId was captured at mount rather than looked up. */
            <Tooltip title="Closes this tab">
              <Button
                startIcon={<VerticalSplit />}
                onClick={() => {
                  backToSidePanel(self);
                }}
                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                Back to panel
              </Button>
            </Tooltip>
          )}

          <Box sx={{ flexGrow: 1 }} />

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
        </Toolbar>
      </AppBar>

      {host === "panel" && (
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={closeMenu}>
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
                control that only opens the tab would promise something this
                click does not deliver. */}
            <ListItemText
              primary="Open in a tab"
              secondary="Where it can float on top of other apps"
            />
          </MenuItem>
        </Menu>
      )}
    </>
  );
};

import {
  OpenInNew,
  PictureInPictureAlt,
  TabUnselected,
  WebAsset,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  Divider,
  IconButton,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { FC, useContext } from "react";

import { canFloat, openFloat } from "../float";
import { getHost } from "../host";
import { SelectionContext, SelectionToolbar } from "../Tabs/selection";
import logo from "./logo.svg";

const handleNewWindow = async () => {
  const { id } = await chrome.windows.create({ focused: true });
  if (id) {
    await chrome.sidePanel.open({ windowId: id });
  }
};

const handleCRXWindow = async () => {
  const crxTabs = await chrome.tabs.query({ url: chrome.runtime.getURL("*") });
  const crxTab = crxTabs[0];
  if (crxTab && crxTab.id) {
    await chrome.tabs.update(crxTab.id, { active: true });
    void chrome.windows.update(crxTab.windowId, { focused: true });
  } else {
    await chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),
    });
  }
};

const handleNewTab = async () => {
  await chrome.tabs.create({ active: true });
};

const handlePopOut = async () => {
  await chrome.windows.create({
    url: chrome.runtime.getURL("index.html?host=window"),
    type: "popup",
    width: 420,
    height: 720,
  });
  // There is no chrome.sidePanel.close() (w3c/webextensions#521); a panel page
  // closing itself is the supported way, and it turns this into a hand-off
  // rather than leaving a second copy of the UI open behind the window.
  window.close();
};

export const ControlBar: FC = () => {
  const { selected } = useContext(SelectionContext);
  const host = getHost();

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
          <IconButton onClick={handleCRXWindow}>
            <img src={logo} />
          </IconButton>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              gap: 1,
              justifyContent: "center",
            }}
          >
            <Button startIcon={<TabUnselected />} onClick={handleNewTab}>
              New tab
            </Button>
            <Button startIcon={<WebAsset />} onClick={handleNewWindow}>
              New window
            </Button>
          </Box>
          {host === "panel" && (
            <Tooltip title="Open in a separate window">
              <IconButton onClick={handlePopOut}>
                <OpenInNew />
              </IconButton>
            </Tooltip>
          )}
          {host === "window" && canFloat() && (
            <Tooltip title="Float on top of other apps">
              {/* Must stay a direct click handler — openFloat() needs the
                  click's transient activation, so nothing may await first. */}
              <IconButton onClick={openFloat}>
                <PictureInPictureAlt />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

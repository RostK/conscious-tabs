import { TabUnselected, WebAsset } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  Divider,
  IconButton,
  Toolbar,
} from "@mui/material";
import { FC, useContext } from "react";

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

export const ControlBar: FC = () => {
  const { selected } = useContext(SelectionContext);

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
          backgroundColor: "white",
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
        </Toolbar>
      </AppBar>
    </>
  );
};

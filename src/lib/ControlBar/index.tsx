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
        }}
      >
        <SelectionToolbar />
        <Divider />
        <Toolbar>
          <IconButton>
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

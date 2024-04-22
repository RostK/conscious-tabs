import { TabUnselected, WebAsset } from "@mui/icons-material";
import { AppBar, Button, Divider, IconButton, Toolbar } from "@mui/material";
import { FC, useContext } from "react";

import { SelectionContext, SelectionToolbar } from "../Tabs/selection";
import logo from "./logo.svg";

export const ControlBar: FC = () => {
  const { selected } = useContext(SelectionContext);

  return (
    <>
      <Toolbar sx={{ visibility: "hidden" }} />
      {selected.length && (
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
          <Button>
            <TabUnselected /> New tab
          </Button>
          <Button>
            <WebAsset /> New window
          </Button>
        </Toolbar>
      </AppBar>
    </>
  );
};

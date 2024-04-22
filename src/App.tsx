import "./App.css";

import { SearchOffOutlined, SearchOutlined } from "@mui/icons-material";
import {
  alpha,
  AppBar,
  IconButton,
  InputBase,
  styled,
  Toolbar,
} from "@mui/material";
import { useState } from "react";

import { ControlBar } from "./lib/ControlBar";
import { SelectionProvider } from "./lib/Tabs/selection";
import { PromptProvider } from "./lib/Tabs/undo";
import { SearchView } from "./views/SearchView";
import { TabsView } from "./views/TabsView";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch",
      },
    },
  },
}));

function App() {
  const [search, setSearch] = useState("");

  return (
    <PromptProvider>
      <SelectionProvider>
        <AppBar position="sticky">
          <Toolbar>
            <Search>
              <SearchIconWrapper>
                <SearchOutlined />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search…"
                inputProps={{ "aria-label": "search" }}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                endAdornment={
                  search && (
                    <IconButton
                      onClick={() => {
                        setSearch("");
                      }}
                    >
                      <SearchOffOutlined />
                    </IconButton>
                  )
                }
              />
            </Search>
          </Toolbar>
        </AppBar>
        {!search && <TabsView />}
        {search && <SearchView search={search} />}
        <ControlBar />
      </SelectionProvider>
    </PromptProvider>
  );
}

export default App;

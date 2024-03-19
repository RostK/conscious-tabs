import { useState } from "react";
import "./App.css";
import {
  alpha,
  AppBar,
  IconButton,
  InputBase,
  styled,
  Toolbar,
} from "@mui/material";
import logo from "./logo.svg";
import { SearchOffOutlined, SearchOutlined } from "@mui/icons-material";
import { TabsView } from "./views/TabsView";
import { SearchView } from "./views/SearchView";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  marginLeft: theme.spacing(1),
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
    <>
      <AppBar position="sticky">
        <Toolbar>
          <img src={logo} />
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
    </>
  );
}

export default App;

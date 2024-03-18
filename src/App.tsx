import { useCallback, useEffect, useState } from "react";
import "./App.css";
import Tab = chrome.tabs.Tab;
import TabGroup = chrome.tabGroups.TabGroup;
import Window = chrome.windows.Window;

import TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE;
import { useDebouncedCallback } from "use-debounce";
import { GroupItem, TabItem, TabsStructure } from "./Tabs/types";
import { WindowListItem } from "./Tabs/WindowListItem.tsx";
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

const getTabsTree = (tabs: Tab[], groups: TabGroup[]): TabsStructure => {
  const structure = new Map<string, TabItem | GroupItem>();
  tabs
    .sort((a, b) => a.index - b.index)
    .forEach(
      ({ id, title, url, index, windowId, groupId, favIconUrl, active }) => {
        if (groupId === TAB_GROUP_ID_NONE) {
          // Tab not in a group
          structure.set(`tab:${id}`, {
            type: "tab",
            id,
            title,
            url,
            index,
            windowId,
            groupId,
            favIconUrl,
            active,
          });
          return;
        }
        const groupItem = structure.get(`group:${groupId}`) as GroupItem;
        // Tab in a group
        if (groupItem) {
          //Group already structured
          structure.set(`group:${groupId}`, {
            ...groupItem,
            tabs: [
              ...groupItem.tabs,
              {
                type: "tab",
                id,
                title,
                url,
                index,
                windowId,
                groupId,
                favIconUrl,
                active,
              },
            ],
          });
          return;
        }
        // First tab in a group
        const groupData = groups.find(({ id }) => id === groupId);
        if (!groupData) {
          // Tab is absent somehow
          structure.set(`tab:${id}`, {
            type: "tab",
            id,
            title,
            url,
            index,
            windowId,
            groupId,
            favIconUrl,
            active,
          });
          return;
        }
        //Create new group in structure
        structure.set(`group:${groupId}`, {
          ...groupData,
          type: "group",
          tabs: [
            {
              type: "tab",
              id,
              title,
              url,
              index,
              windowId,
              groupId,
              favIconUrl,
              active,
            },
          ],
        });
      },
    );
  return [...structure.values()];
};

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
  const [tabsStructure, setTabsStructure] = useState<TabsStructure>([]);
  const [windows, setWindows] = useState<Window[]>([]);
  const getTabsFunc = async () => {
    const tabsData = await chrome.tabs.query({});
    const groups = await chrome.tabGroups.query({});
    const tabs = search
      ? tabsData.filter((tab) => {
          return tab.title?.includes(search) || tab.url?.includes(search);
        })
      : tabsData;
    setTabsStructure(getTabsTree(tabs, groups));
  };
  const getTabs = useDebouncedCallback(getTabsFunc, 10);

  useEffect(() => {
    getTabs();
  }, [getTabs, search]);

  const getWindows = useCallback(async () => {
    const windows = await chrome.windows.getAll();
    setWindows(windows);
  }, []);
  useEffect(() => {
    chrome.tabs.onUpdated.addListener(getTabs);
    chrome.tabs.onActivated.addListener(getTabs);
    chrome.tabs.onRemoved.addListener(getTabs);
    chrome.tabGroups.onUpdated.addListener(getTabs);
    chrome.windows.onRemoved.addListener(getWindows);
    chrome.windows.onCreated.addListener(getWindows);
    chrome.windows.onFocusChanged.addListener(getWindows);
    void getTabs();
    void getWindows();
    return () => {
      chrome.tabs.onUpdated.removeListener(getTabs);
      chrome.tabs.onActivated.removeListener(getTabs);
      chrome.tabs.onRemoved.removeListener(getTabs);
      chrome.tabGroups.onUpdated.removeListener(getTabs);
      chrome.windows.onRemoved.removeListener(getWindows);
      chrome.windows.onCreated.removeListener(getWindows);
      chrome.windows.onFocusChanged.removeListener(getWindows);
    };
  }, [getTabs, getWindows]);
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
      {windows.map((window) => (
        <WindowListItem
          focus={!search}
          key={"w" + window.id + window.focused}
          window={window}
          tabsStructure={tabsStructure.filter(
            ({ windowId }) => window.id === windowId,
          )}
          single={Boolean(search) || windows.length === 1}
        />
      ))}
    </>
  );
}

export default App;

import "./App.css";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SearchOffOutlined, SearchOutlined } from "@mui/icons-material";
import {
  AppBar,
  Box,
  IconButton,
  InputBase,
  ListItemButton,
  Paper,
  styled,
  Toolbar,
  Typography,
} from "@mui/material";
import { ComponentProps, useCallback, useContext, useState } from "react";

import { ControlBar } from "./lib/ControlBar";
import { FloatClosedNotice } from "./lib/FloatClosedNotice.tsx";
import { srOnly } from "./lib/srOnly.ts";
import { AudioTabs } from "./lib/Tabs/AudioTabs";
import { CurrentTab } from "./lib/Tabs/CurrentTab";
import { DefaultDrag, DZCurrentData } from "./lib/Tabs/DnD";
import { setRowDragActive } from "./lib/Tabs/elements/rowControls.ts";
import { TabAvatarsDisplay } from "./lib/Tabs/elements/TabAvatarsDisplay.tsx";
import { SelectionContext, SelectionProvider } from "./lib/Tabs/selection";
import { TabDisplay } from "./lib/Tabs/Tab/TabDisplay.tsx";
import { GroupDisplay } from "./lib/Tabs/TabsGroup/GroupDisplay.tsx";
import { PromptProvider } from "./lib/Tabs/undo";
import { SearchView } from "./views/SearchView";
import { TabsView } from "./views/TabsView";

// A quiet paper pill with a hairline border, like the app's input fields —
// not a colour-filled field on a coloured bar.
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create("border-color"),
  "&:hover": {
    borderColor: theme.palette.text.secondary,
  },
  "&:focus-within": {
    borderColor: theme.palette.text.primary,
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
  color: theme.palette.text.secondary,
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
      width: "20ch",
      "&:focus": {
        width: "22ch",
      },
    },
  },
}));

function App() {
  const { dispatch: dispatchSelected } = useContext(SelectionContext);

  const [dragging, setDragging] = useState<DefaultDrag | null>(null);

  const [search, setSearch] = useState("");
  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, keyboardSensor);

  const handleDragStart = useCallback<
    Required<ComponentProps<typeof DndContext>>["onDragStart"]
  >(({ active }) => {
    setRowDragActive(true);
    setDragging(active.data.current as unknown as DefaultDrag);
  }, []);

  const handleDragCancel = useCallback(() => {
    setRowDragActive(false);
    setDragging(null);
  }, []);

  const handleDragStop = useCallback<
    Required<ComponentProps<typeof DndContext>>["onDragEnd"]
  >(
    async ({ over }) => {
      const overData = over?.data.current as DZCurrentData | undefined;
      if (overData?.dropHandler && dragging) {
        await overData.dropHandler(dragging, overData);
        if (Array.isArray(dragging)) {
          dispatchSelected({ type: "clear" });
        }
      }
      setRowDragActive(false);
      setDragging(null);
    },
    [dispatchSelected, dragging],
  );

  return (
    <PromptProvider>
      <SelectionProvider>
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragStop}
          onDragStart={handleDragStart}
          // E-11: a drag released outside the float's window never reaches a
          // dropzone, and without this the overlay stayed on screen following
          // a pointer that had left the building. The float makes this easy to
          // hit — it is a 400px window with a lot of desktop around it.
          onDragCancel={handleDragCancel}
        >
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: "background.paper",
              color: "text.primary",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            {/* Inside the banner, not before it: a heading floating outside
                every landmark is content no landmark contains, which is its
                own failure. Off screen because the visible identity is the
                logo mark below, and a second title would just be clutter. */}
            <Typography variant="h1" sx={{ ...srOnly, fontSize: "1rem" }}>
              Conscious Tabs
            </Typography>
            <Toolbar sx={{ gap: 1 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
              </Box>
              <AudioTabs />
            </Toolbar>
            <CurrentTab />
            <FloatClosedNotice />
          </AppBar>
          {/* The list is the page's content. Without this the document had
              no main landmark at all, so "skip to content" had nothing to
              skip to and the only way in was from the very top. */}
          <Box component="main">
            {!search && <TabsView />}
            {search && <SearchView search={search} />}
          </Box>
          <ControlBar />
          <DragOverlay
            style={{ pointerEvents: "none", opacity: 0.85 }}
            dropAnimation={null}
          >
            {dragging ? (
              <Paper>
                {Array.isArray(dragging) && (
                  <ListItemButton dense sx={{ height: 49.5 }}>
                    <TabAvatarsDisplay tabsStructure={dragging} />
                  </ListItemButton>
                )}
                {!Array.isArray(dragging) && dragging.type === "tab" && (
                  <TabDisplay key={`drag-${dragging.id}`} tab={dragging} />
                )}
                {!Array.isArray(dragging) && dragging.type === "group" && (
                  <GroupDisplay key={`drag-${dragging.id}`} group={dragging} />
                )}
              </Paper>
            ) : null}
          </DragOverlay>
        </DndContext>
      </SelectionProvider>
    </PromptProvider>
  );
}

export default App;

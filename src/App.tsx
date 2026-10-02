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
  debounce,
  IconButton,
  InputBase,
  ListItemButton,
  Paper,
  styled,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  ComponentProps,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ControlBar } from "./lib/ControlBar";
import {
  getFloatState,
  reportFloatSearch,
  subscribeFloat,
  takeFloatSearch,
} from "./lib/float";
import { FloatClosedNotice } from "./lib/FloatClosedNotice.tsx";
import { getHost } from "./lib/host";
import { ShortcutNotice } from "./lib/ShortcutNotice.tsx";
import { srOnly } from "./lib/srOnly.ts";
import { AudioTabs } from "./lib/Tabs/AudioTabs";
import { CurrentTab } from "./lib/Tabs/CurrentTab";
import {
  DefaultDrag,
  dragAnnouncements,
  dragInstructions,
  DZCurrentData,
} from "./lib/Tabs/DnD";
import {
  dragFocusKey,
  isPlainArrow,
  oweFocusTo,
  setRowDragActive,
} from "./lib/Tabs/elements/rowControls.ts";
import { TabAvatarsDisplay } from "./lib/Tabs/elements/TabAvatarsDisplay.tsx";
import { SelectionContext, SelectionProvider } from "./lib/Tabs/selection";
import { TabDisplay } from "./lib/Tabs/Tab/TabDisplay.tsx";
import { GroupDisplay } from "./lib/Tabs/TabsGroup/GroupDisplay.tsx";
import { PromptProvider } from "./lib/Tabs/undo";
import { useInitialFocus } from "./lib/useInitialFocus.ts";
import { useScrollPadding } from "./lib/useScrollPadding.ts";
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

/** Said in the app's own live region when a drop is refused. */
const DROP_FAILED = "That could not be moved there.";

/** When to check that a keyboard drop left focus somewhere — see `settleFocus`. */
const FOCUS_SETTLE_MS = [400, 1500];

function App() {
  const { dispatch: dispatchSelected } = useContext(SelectionContext);

  const [dragging, setDragging] = useState<DefaultDrag | null>(null);

  const [search, setSearch] = useState("");

  /**
   * One claim on the caret, in one place.
   *
   * `TabDisplay` used to autofocus the active tab's row, which made two
   * components race for focus on every mount — and the row won in a grouped
   * list, because `GroupListItem` never forwarded the prop that was supposed
   * to switch it off. Landing on the active tab is still what the keyboard
   * does; it is one Down away (below) rather than a second claim.
   */
  const searchInput = useRef<HTMLInputElement>(null);
  useInitialFocus(searchInput);

  /**
   * What the list did, for someone who cannot see it do it.
   *
   * Typing in the search box silently rewrites the page: rows leave, the count
   * changes, and a screen reader is told none of it because nothing it was
   * focused on moved. Closing a tab is already spoken — notistack's snackbar
   * carries its own live region — so this is the one change of consequence
   * that happened in silence.
   *
   * Debounced because `polite` queues rather than interrupts: announcing every
   * keystroke means hearing five stale counts before the one that matters.
   */
  /**
   * Q-1. The float and the anchor are separate documents, so `search` exists
   * twice; without this, filtering in the float and closing it dropped you on
   * an unfiltered anchor. Resolved as the plan recommended — the float reports,
   * the anchor adopts — rather than by sharing state continuously, which
   * nothing asked for.
   */
  const host = getHost();
  const reported = useRef(false);
  useEffect(() => {
    if (host !== "float") return;
    // Not on mount: the float opens with an empty box, and reporting that
    // would hand the anchor an empty search the user never typed, wiping the
    // one they left behind.
    if (!reported.current) {
      reported.current = true;
      return;
    }
    const report = debounce(() => {
      reportFloatSearch(search);
    }, 300);
    report();
    return () => {
      report.clear();
    };
  }, [host, search]);

  const floating =
    useSyncExternalStore(subscribeFloat, getFloatState) === "open";
  const wasFloating = useRef(false);
  useEffect(() => {
    if (floating) {
      wasFloating.current = true;
      return;
    }
    if (!wasFloating.current) return;
    wasFloating.current = false;
    const handed = takeFloatSearch();
    if (handed !== undefined) setSearch(handed);
  }, [floating]);

  const [matches, setMatches] = useState<number>();
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!search || matches === undefined) {
      setAnnouncement("");
      return;
    }
    const say = debounce(() => {
      setAnnouncement(`${matches} tab${matches === 1 ? "" : "s"} match`);
    }, 600);
    say();
    return () => {
      say.clear();
    };
  }, [search, matches]);
  // The header is sticky over the top of the list. Without telling the
  // browser so, Shift+Tab could move focus to a row lying wholly underneath it.
  const headerRef = useScrollPadding("top");
  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, keyboardSensor);

  // Which drag the handlers below are answering for. A drop is carried out
  // asynchronously, and a second drag can begin while the first is still
  // awaited; the first one's tail must not switch off the second one's flag.
  const dragTurn = useRef(0);

  const handleDragStart = useCallback<
    Required<ComponentProps<typeof DndContext>>["onDragStart"]
  >(({ active }) => {
    dragTurn.current += 1;
    // Whatever the last drop was owed is void: a row picked up again within
    // moments of a keyboard drop would otherwise take focus when a *pointer*
    // let it go. Found in review.
    oweFocusTo(undefined);
    // So a second refusal is a change to the live region, and is read again.
    setAnnouncement((said) => (said === DROP_FAILED ? "" : said));
    setRowDragActive(true);
    setDragging(active.data.current as unknown as DefaultDrag);
  }, []);

  const handleDragCancel = useCallback(() => {
    oweFocusTo(undefined);
    setRowDragActive(false);
    setDragging(null);
  }, []);

  /**
   * After a keyboard drop, focus must be *somewhere*.
   *
   * The dropped row's handle takes it when the row is rebuilt (`oweFocusTo`).
   * But a drop onto a collapsed window or group leaves no row to rebuild, and
   * dropping a selection dissolves the toolbar its handle sat in. Both were
   * measured to leave focus on the body, where no key does anything. So once
   * the list has had time to settle, focus nobody holds goes to the search
   * field — the keyboard's home here, one `↓` from the list.
   *
   * Checked twice, because how long Chrome takes to report a move is not ours
   * to know: a handle can take focus and lose it again when the report lands.
   */
  const settleFocus = useCallback((turn: number) => {
    for (const delay of FOCUS_SETTLE_MS) {
      window.setTimeout(() => {
        // A newer drag owns focus now; a tab row is off screen while dragged
        // and its focus sits on the body by design.
        if (dragTurn.current !== turn) return;
        const field = searchInput.current;
        if (!field) return;
        const { activeElement, body } = field.ownerDocument;
        if (activeElement && activeElement !== body) return;
        field.focus();
      }, delay);
    }
  }, []);

  const handleDragStop = useCallback<
    Required<ComponentProps<typeof DndContext>>["onDragEnd"]
  >(
    async ({ over, activatorEvent }) => {
      const turn = dragTurn.current;
      const byKeyboard = activatorEvent.type === "keydown";
      // A keyboard drop can move the row somewhere that rebuilds it, and the
      // handle that had focus goes with the old one. The new handle takes it
      // back as it mounts. Recorded before the drop is carried out, because
      // the rebuild can arrive while that is still awaited.
      if (byKeyboard && dragging && !Array.isArray(dragging)) {
        oweFocusTo(dragFocusKey(dragging.type, dragging.id));
      }
      const overData = over?.data.current as DZCurrentData | undefined;
      try {
        if (overData?.dropHandler && dragging) {
          await overData.dropHandler(dragging, overData);
          if (Array.isArray(dragging)) {
            dispatchSelected({ type: "clear" });
          }
        }
      } catch (error) {
        // Chrome refuses some moves — a group into the middle of another, a
        // tab among pinned ones — and a handler that does not catch that
        // rejects. The drop was already announced as made, so say it was not.
        console.error(error);
        setAnnouncement(DROP_FAILED);
      } finally {
        // In a `finally`, and it was not: a rejected drop used to skip these,
        // which left the drag flag on and every row's arrow keys dead until
        // the next drag. Found in review.
        if (dragTurn.current === turn) {
          setRowDragActive(false);
          setDragging(null);
        }
      }
      if (byKeyboard) settleFocus(turn);
    },
    [dispatchSelected, dragging, settleFocus],
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
          // AC-15: said, not left to dnd-kit's defaults, which read out a tab's
          // numeric id. The instructions are what the drag handle's
          // `aria-describedby` points at.
          accessibility={{
            announcements: dragAnnouncements,
            screenReaderInstructions: dragInstructions,
          }}
        >
          <AppBar
            ref={headerRef}
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
                    inputProps={{
                      "aria-label": "search",
                      // How a row finds its way back here. The rows must not
                      // know this component's markup, and an aria-label is a
                      // name for a user, not a selector for us.
                      "data-search-field": "",
                    }}
                    inputRef={searchInput}
                    value={search}
                    onKeyDown={(event) => {
                      // Down leaves the field for the list, landing on the tab
                      // the user is already looking at. Bound here and not in
                      // the list: plain arrows stay unclaimed between rows, so
                      // the row walk keeps Left and Right to itself.
                      if (event.key !== "ArrowDown") return;
                      if (!isPlainArrow(event)) return;
                      // Scoped to <main>: the DragOverlay renders a row of its
                      // own outside it, and "the first row" would find that one
                      // mid-drag.
                      const list = document.querySelector("main");
                      const row =
                        list?.querySelector<HTMLElement>("[data-active-tab]") ??
                        list?.querySelector<HTMLElement>("[data-tab-row]");
                      if (!row) return;
                      event.preventDefault();
                      row.focus();
                    }}
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
            <ShortcutNotice />
          </AppBar>
          {/* The list is the page's content. Without this the document had
              no main landmark at all, so "skip to content" had nothing to
              skip to and the only way in was from the very top. */}
          <Box component="main">
            {/* Inside the landmark, and mounted whether or not a search is
                running — a live region added at the same moment as its text
                is not reliably read. */}
            <Box role="status" aria-live="polite" sx={srOnly}>
              {announcement}
            </Box>
            {!search && <TabsView />}
            {search && <SearchView search={search} onMatches={setMatches} />}
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

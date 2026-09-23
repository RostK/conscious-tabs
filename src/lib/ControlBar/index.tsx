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
  Toolbar,
  Tooltip,
} from "@mui/material";
import {
  FC,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

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
import { bringPanelAlong } from "../surfaces";
import { SelectionContext, SelectionToolbar } from "../Tabs/selection";
import logo from "./logo.svg";

const handleNewWindow = async () => {
  const { id } = await chrome.windows.create({ focused: true });
  if (id) {
    await bringPanelAlong(id);
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
 * One labelled control per host, never behind a menu.
 *
 * Reaching the float already costs two clicks and cannot cost fewer: the side
 * panel is not a top-level traversable, so it can never call `requestWindow()`
 * itself (C-1), and activation does not cross documents (C-3). Two is the
 * platform floor, so anything that adds a third is spending the one budget
 * this feature has none of. A menu behind the logo was tried and did exactly
 * that.
 *
 * The bar fits a labelled button because New tab and New window gave up their
 * labels for it — they are conventional actions nobody has to be taught, while
 * floating is the one nobody can guess.
 */
export const ControlBar: FC = () => {
  const { selected } = useContext(SelectionContext);
  const host = getHost();
  const self = useSelfTab();
  const floating =
    useSyncExternalStore(subscribeFloat, getFloatState) === "open";

  /**
   * US-4: "land on a full, working tab manager, so that I never have to hunt
   * for it." Closing the float used to leave the user wherever they were, with
   * the manager in a tab they had to go and find — harder than it sounds,
   * because this extension's own pages are filtered out of its own list, so
   * the manager cannot help you locate the manager.
   *
   * The tab is activated; the window deliberately is not focused. An eviction
   * (E-1) can happen while the user is in another application entirely, and
   * yanking Chrome to the front would be a far ruder answer than simply being
   * the tab they land on when they come back of their own accord.
   */
  const wasFloating = useRef(false);
  useEffect(() => {
    if (floating) {
      wasFloating.current = true;
      return;
    }
    if (!wasFloating.current) return;
    wasFloating.current = false;
    if (host === "anchor" && self?.id !== undefined) {
      void chrome.tabs.update(self.id, { active: true });
    }
  }, [floating, host, self]);

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
          <Box
            component="img"
            src={logo}
            alt=""
            sx={{ width: 32, height: 32, flexShrink: 0, mx: 0.5 }}
          />

          {host === "panel" && (
            /* The trailing ellipsis is the whole reason this can be honest:
               it is the long-standing convention for "this opens something
               rather than doing it", and floating cannot be started from the
               side panel at all (C-1). The accessible name opens with the
               visible text so voice control still matches it, then spells out
               the second step. */
            <Button
              startIcon={<PictureInPictureAlt />}
              onClick={handleAnchor}
              aria-label="Float on top — opens the tab manager in a tab, where you can float it over your other apps"
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Float on top…
            </Button>
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
          {host === "float" && (
            /* The float's way back to the manager tab. Not a float affordance,
               so AC-14 is untouched — and deliberately does not close the
               float: it is always-on-top, so it stays visible over the tab you
               just went to, and "Stop floating" is waiting there when you want
               it. `openAnchorTab` focuses-or-creates, and while a float is up
               the anchor necessarily exists, so this is always a "go to". */
            <Tooltip title="Show the full manager in its tab">
              <Button
                startIcon={<OpenInNew />}
                onClick={handleAnchor}
                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                Go to tab
              </Button>
            </Tooltip>
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
    </>
  );
};

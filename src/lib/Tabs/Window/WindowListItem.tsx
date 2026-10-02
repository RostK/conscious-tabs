import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import {
  FC,
  MouseEventHandler,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { bringPanelAlong } from "../../surfaces.ts";
import { closeWindow } from "../actions.ts";
import { DropPlaceholder, useDropzone } from "../DnD";
import { ItemButton } from "../elements/ItemButton.tsx";
import {
  rowControlProps,
  selectedProps,
} from "../elements/rowControls.ts";
import { SelectionContext } from "../selection";
import { Tabs } from "../Tabs.tsx";
import { TabsStructure } from "../types.ts";
import { handleInnerDrop } from "./handleInnerDrop.ts";
import { WindowDisplay } from "./WindowDisplay.tsx";

/**
 * What a screen reader says on entering a window row — SPEC-04 AC-29.
 *
 * A PROPOSAL, awaiting a listen (PLAN-SPEC-04 T-2b, "Open for T-4/T-5"), in the
 * same shape as the group row's: the subject once and first, then how much is in
 * it — "Window 1, 12 tabs", with ", current window" on the one that is focused.
 * Changing the wording is this one function, plus its assertions in
 * WindowDisplay.test.tsx.
 *
 * `index` is zero-based and is the window's place among the windows the list
 * *renders* (TabsView drops the ones with nothing to show), so two windows
 * holding the same number of tabs still have different names. `count` is what
 * the window holds, a collapsed group's tabs included, like the switch button's
 * name below. Not numbered like AM-3's tab rows, so this carries no
 * `data-row-label`. A string, never markup.
 */
const toolbarName = (index: number, count: number, focused: boolean): string =>
  `Window ${index + 1}, ${count} tab${count === 1 ? "" : "s"}${
    focused ? ", current window" : ""
  }`;

export const WindowListItem: FC<{
  window: chrome.windows.Window;
  tabsStructure: TabsStructure;
  single: boolean;
  /** Zero-based place among the rendered windows; names the row (D-7). */
  index: number;
}> = ({ single, window, tabsStructure, index }) => {
  // flatMap, not a reduce that spreads: spreading the accumulator copies
  // everything gathered so far on every item, which is quadratic in the number
  // of rows for a result that is the same list either way.
  const flatTabs = useMemo(
    () =>
      tabsStructure.flatMap((item) => (item.type === "group" ? item.tabs : item)),
    [tabsStructure],
  );
  const [isOpen, setIsOpen] = useState(window.focused);
  const handleOpen = useCallback(() => {
    setIsOpen((state) => !state);
  }, []);
  useEffect(() => {
    setIsOpen(window.focused);
  }, [window.focused]);

  const { selected, dispatch } = useContext(SelectionContext);

  const handleActivate = useCallback<MouseEventHandler>(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.id) {
        await bringPanelAlong(window.id);
        void chrome.windows.update(window.id, { focused: true });
      }
    },
    [window.id],
  );

  const handleCloseWindow = useCallback<MouseEventHandler>(() => {
    if (window.id !== undefined) {
      void closeWindow(window.id);
    }
  }, [window.id]);
  const itemAction = useMemo(() => {
    return (
      <ItemButton
        className="close-button"
        onClick={handleCloseWindow}
        edge="end"
        {...rowControlProps}
        aria-label={`Close this window and its ${flatTabs.length} tab${
          flatTabs.length === 1 ? "" : "s"
        }`}
      >
        <Close />
      </ItemButton>
    );
  }, [handleCloseWindow, flatTabs.length]);

  // Through a Set: `includes` on an array is a scan, and this asks it once per
  // tab in the window, on every render of every window row.
  const isSelected = useMemo(() => {
    const chosen = new Set(selected);
    return !flatTabs.find(({ id }) => id && !chosen.has(id));
  }, [flatTabs, selected]);
  const handleSelectButton = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      isSelected
        ? dispatch({
            type: "deselect",
            data: flatTabs.map((tab) => tab.id as number),
          })
        : dispatch({
            type: "select",
            data: flatTabs.map((tab) => tab.id as number),
          });
    },
    [dispatch, flatTabs, isSelected],
  );

  const pre = useMemo(() => {
    return (
      <ItemButton
        {...rowControlProps}
        aria-label={
          isSelected
            ? "Deselect every tab in this window"
            : "Select every tab in this window"
        }
        onClick={handleSelectButton}
        className="itemAction"
        {...selectedProps(isSelected)}
      >
        {isSelected ? <CheckBoxOutlined /> : <CheckBoxOutlineBlankOutlined />}
      </ItemButton>
    );
  }, [handleSelectButton, isSelected]);

  const { isOver, Dropzone } = useDropzone({
    id: window.id as number,
    type: "in-window",
    data: window,
    onDrop: handleInnerDrop,
  });

  return (
    <>
      {!single && (
        <Dropzone>
          {/* Around the header only. The placeholder below is itself a
              listitem (TabGrid), so wrapping the whole Dropzone body would
              nest one inside another and fire aria-required-parent. */}
          <Box role="listitem">
            <WindowDisplay
              label={toolbarName(index, flatTabs.length, !!window.focused)}
              pre={pre}
              tabs={flatTabs}
              isOpen={isOpen}
              handleOpenClick={handleOpen}
              handleActivateClick={handleActivate}
              itemAction={itemAction}
            />
          </Box>
          {isOver && <DropPlaceholder />}
        </Dropzone>
      )}
      {(single || isOpen) && (
        <Tabs tabsStructure={tabsStructure} window={window} />
      )}
    </>
  );
};

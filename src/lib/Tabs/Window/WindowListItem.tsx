import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
} from "@mui/icons-material";
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
import { rowControlProps } from "../elements/rowControls.ts";
import { SelectionContext } from "../selection";
import { Tabs } from "../Tabs.tsx";
import { TabItem, TabsStructure } from "../types.ts";
import { handleInnerDrop } from "./handleInnerDrop.ts";
import { WindowDisplay } from "./WindowDisplay.tsx";

export const WindowListItem: FC<{
  window: chrome.windows.Window;
  tabsStructure: TabsStructure;
  single: boolean;
  focus?: boolean;
}> = ({ focus, single, window, tabsStructure }) => {
  const flatTabs = useMemo(() => {
    return tabsStructure.reduce((acc, item) => {
      return item.type === "group" ? [...acc, ...item.tabs] : [...acc, item];
    }, [] as TabItem[]);
  }, [tabsStructure]);
  const [isOpen, setIsOpen] = useState(window.focused);
  const handleOpen = useCallback(() => {
    setIsOpen((state) => !state);
  }, []);
  useEffect(() => {
    setIsOpen(window.focused);
  }, [window.focused]);

  const { selected, dispatch } = useContext(SelectionContext);

  const handleActivate = useCallback<MouseEventHandler<HTMLButtonElement>>(
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

  const isSelected = useMemo(
    () => !flatTabs.find(({ id }) => id && !selected.includes(id)),
    [flatTabs, selected],
  );
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
        className={!isSelected ? "itemAction" : undefined}
        sx={{
          position: "absolute",
          left: -8,
        }}
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
          <WindowDisplay
            pre={pre}
            tabs={flatTabs}
            isOpen={isOpen}
            handleOpenClick={handleOpen}
            handleActivateClick={handleActivate}
            itemAction={itemAction}
          />
          {isOver && <DropPlaceholder />}
        </Dropzone>
      )}
      {(single || isOpen) && (
        <Tabs focus={focus} tabsStructure={tabsStructure} window={window} />
      )}
    </>
  );
};

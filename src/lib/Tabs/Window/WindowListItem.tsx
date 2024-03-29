import { Close } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import {
  FC,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DropPlaceholder, useDropzone } from "../DnD";
import { Tabs } from "../Tabs.tsx";
import { TabItem, TabsStructure } from "../types.ts";
import { promptUndo } from "../undo/promptUndo.tsx";
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

  const handleActivate = useCallback<MouseEventHandler<HTMLButtonElement>>(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.id) {
        await chrome.sidePanel.open({ windowId: window.id });
        void chrome.windows.update(window.id, { focused: true });
      }
    },
    [window.id],
  );

  const handleCloseWindow = useCallback<MouseEventHandler>(async () => {
    try {
      await chrome.windows.remove(window.id as number);
      promptUndo("Window is closed");
    } catch (e) {
      /* empty */
    }
  }, [window]);
  const itemAction = useMemo(() => {
    return (
      <IconButton
        className="close-button"
        onClick={handleCloseWindow}
        edge="end"
        aria-label="delete"
      >
        <Close />
      </IconButton>
    );
  }, [handleCloseWindow]);

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

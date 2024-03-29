import { FC, MouseEventHandler, useCallback, useMemo, useState } from "react";

import { DropPlaceholder, useDropzone } from "../DnD";
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

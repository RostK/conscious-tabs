import { FC, MouseEventHandler, useCallback, useMemo } from "react";
import { TabItem, TabsStructure } from "../types.ts";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  IconButton,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { Tabs } from "../Tabs.tsx";
import { useDropzone, DropPlaceholder } from "../DnD";
import { handleInnerDrop } from "./handleInnerDrop.ts";
import { TabAvatarsDisplay } from "../elements/TabAvatarsDisplay.tsx";
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
  const handleOpen = useCallback<MouseEventHandler<HTMLButtonElement>>(
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

  return single ? (
    <Tabs focus={focus} tabsStructure={tabsStructure} window={window} />
  ) : (
    <Accordion
      square
      disableGutters
      key={window.id}
      defaultExpanded={window.focused}
    >
      <Dropzone>
        <AccordionSummary
          expandIcon={
            <IconButton>
              <ExpandMore />
            </IconButton>
          }
          id={`window-${window.id}`}
        >
          <Button onClick={handleOpen}>
            <TabAvatarsDisplay tabsStructure={flatTabs} />
          </Button>
        </AccordionSummary>
        {isOver && (
          <AccordionDetails style={{ padding: 0 }}>
            <DropPlaceholder />
          </AccordionDetails>
        )}
      </Dropzone>
      <AccordionDetails style={{ padding: 0 }}>
        <Tabs tabsStructure={tabsStructure} window={window} />
      </AccordionDetails>
    </Accordion>
  );
};

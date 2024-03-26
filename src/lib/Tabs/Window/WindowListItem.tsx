import { FC, MouseEventHandler, useCallback, useMemo } from "react";
import { TabItem, TabsStructure } from "../types.ts";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  AvatarGroup,
  Button,
  IconButton,
} from "@mui/material";
import { ArticleOutlined, ExpandMore } from "@mui/icons-material";
import { Tabs } from "../Tabs.tsx";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { DropPlaceholder } from "../DnD";
import { handleInnerDrop } from "./handleInnerDrop.ts";
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
            <AvatarGroup
              total={flatTabs.length}
              max={10}
              slotProps={{
                additionalAvatar: {
                  sx: { fontSize: "0.7rem", width: 24, height: 24 },
                },
              }}
              renderSurplus={(surplus) => <span>{surplus}</span>}
            >
              {flatTabs.slice(0, 10).map((tab) => (
                <Avatar
                  sx={{ background: "lightgray", width: 24, height: 24 }}
                  key={tab.id}
                  src={tab.favIconUrl}
                >
                  <ArticleOutlined />
                </Avatar>
              ))}
            </AvatarGroup>
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

import { FC, MouseEventHandler, useCallback, useMemo } from "react";
import { TabItem, TabsStructure } from "./types.ts";
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
import { Tabs } from "./index.tsx";

export const WindowListItem: FC<{
  window: chrome.windows.Window;
  tabsStructure: TabsStructure;
}> = ({ window, tabsStructure }) => {
  const flatTabs = useMemo(() => {
    return tabsStructure.reduce((acc, item) => {
      return item.type === "group" ? [...acc, ...item.tabs] : [...acc, item];
    }, [] as TabItem[]);
  }, [tabsStructure]);
  const handleOpen = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.id) {
        void chrome.windows.update(window.id, { focused: true });
      }
    },
    [window.id],
  );
  return (
    <Accordion
      square
      disableGutters
      key={window.id}
      defaultExpanded={window.focused}
    >
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
      <AccordionDetails style={{ padding: 0 }}>
        <Tabs tabsStructure={tabsStructure} />
      </AccordionDetails>
    </Accordion>
  );
};

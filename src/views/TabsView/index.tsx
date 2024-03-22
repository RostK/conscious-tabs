import { ComponentProps, FC, useCallback, useState } from "react";

import { GroupItem, TabItem } from "../../lib/Tabs";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { TabDisplay } from "../../lib/Tabs/displays/TabDisplay.tsx";
import { Paper } from "@mui/material";
import { WindowListItem } from "../../lib/Tabs";
import { GroupDisplay } from "../../lib/Tabs/displays/GroupDisplay.tsx";

export const TabsView: FC = () => {
  const [dragging, setDragging] = useState<TabItem | GroupItem | null>(null);
  const tabsStructure = useTabsStructure();
  const windows = useWindowsStructure();

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
    setDragging(active.data.current as unknown as TabItem | GroupItem);
  }, []);
  const handleDragStop = useCallback<
    Required<ComponentProps<typeof DndContext>>["onDragEnd"]
  >(
    async ({ over }) => {
      const overData: TabItem | GroupItem | undefined = over?.data.current as
        | TabItem
        | GroupItem
        | undefined;
      if (dragging?.type === "tab") {
        if (dragging?.id && overData?.id && dragging.id !== overData.id) {
          if (overData.type === "tab") {
            const overTab = overData;
            await chrome.tabs.move(dragging.id, {
              index:
                overTab.index > dragging.index
                  ? overTab.index - 1
                  : overTab.index,
              windowId: overTab.windowId,
            });
            if (overTab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
              void chrome.tabs.ungroup(dragging.id);
            } else {
              void chrome.tabs.group({
                groupId: overData.groupId,
                tabIds: dragging.id,
              });
            }
          }
          if (overData.type === "group") {
            await chrome.tabs.group({
              groupId: overData.id,
              tabIds: dragging.id,
            });
          }
        }
      }
      setDragging(null);
    },
    [dragging],
  );
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragStop}
      onDragStart={handleDragStart}
    >
      {windows.map((window) => (
        <WindowListItem
          key={"w" + window.id + window.focused}
          window={window}
          tabsStructure={tabsStructure.filter(
            ({ windowId }) => window.id === windowId,
          )}
          single={windows.length === 1}
        />
      ))}

      <DragOverlay
        style={{ pointerEvents: "none", opacity: 0.85 }}
        dropAnimation={null}
      >
        {dragging ? (
          <Paper>
            {dragging.type === "tab" && (
              <TabDisplay key={`drag-${dragging.id}`} tab={dragging} />
            )}
            {dragging.type === "group" && (
              <GroupDisplay key={`drag-${dragging.id}`} group={dragging} />
            )}
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

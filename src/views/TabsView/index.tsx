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
import { WindowListItem } from "../../lib/Tabs/listItems/WindowListItem.tsx";

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
    ({ over }) => {
      if (dragging?.id && over?.data.current) {
        if (over.data.current.type === "tab") {
          const overTab = over.data.current as TabItem;
          void chrome.tabs.move(dragging.id, {
            index: overTab.index + 1,
            windowId: overTab.windowId,
          });
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

      <DragOverlay style={{ pointerEvents: "none" }} dropAnimation={null}>
        {dragging ? (
          <Paper>
            {dragging.type === "tab" && <TabDisplay tab={dragging} />}
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

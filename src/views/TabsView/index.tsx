import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ListItemButton, Paper } from "@mui/material";
import { ComponentProps, FC, useCallback, useContext, useState } from "react";

import { WindowListItem } from "../../lib/Tabs";
import { DefaultDrag, DZCurrentData } from "../../lib/Tabs/DnD";
import { TabAvatarsDisplay } from "../../lib/Tabs/elements/TabAvatarsDisplay.tsx";
import { SelectionContext } from "../../lib/Tabs/selection";
import { TabDisplay } from "../../lib/Tabs/Tab/TabDisplay.tsx";
import { GroupDisplay } from "../../lib/Tabs/TabsGroup/GroupDisplay.tsx";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";

export const TabsView: FC = () => {
  const { dispatch: dispatchSelected } = useContext(SelectionContext);

  const [dragging, setDragging] = useState<DefaultDrag | null>(null);
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
    setDragging(active.data.current as unknown as DefaultDrag);
  }, []);

  const handleDragStop = useCallback<
    Required<ComponentProps<typeof DndContext>>["onDragEnd"]
  >(
    async ({ over }) => {
      const overData = over?.data.current as DZCurrentData | undefined;
      if (overData?.dropHandler && dragging) {
        await overData.dropHandler(dragging, overData);
        if (Array.isArray(dragging)) {
          dispatchSelected({ type: "clear" });
        }
      }
      setDragging(null);
    },
    [dispatchSelected, dragging],
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
            {Array.isArray(dragging) && (
              <ListItemButton dense sx={{ minHeight: 54.5 }}>
                <TabAvatarsDisplay tabsStructure={dragging} />
              </ListItemButton>
            )}
            {!Array.isArray(dragging) && dragging.type === "tab" && (
              <TabDisplay key={`drag-${dragging.id}`} tab={dragging} />
            )}
            {!Array.isArray(dragging) && dragging.type === "group" && (
              <GroupDisplay key={`drag-${dragging.id}`} group={dragging} />
            )}
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

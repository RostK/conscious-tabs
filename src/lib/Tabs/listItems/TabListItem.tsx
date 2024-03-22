import { TabDisplay } from "../displays/TabDisplay.tsx";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { TabGrid } from "../elements/TabGrid.tsx";

export const TabListItem: typeof TabDisplay = ({ tab, ...props }) => {
  const {
    isOver,
    active,
    setNodeRef: setNodeRefDroppable,
  } = useDroppable({
    id: tab.id as number,
    data: tab,
  });
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef: setNodeRefDraggable,
  } = useDraggable({
    id: tab.id as number,
    data: tab,
  });
  const styleDropable = {
    pointerEvents: active?.id ? ("none" as const) : undefined,
  };
  return (
    <>
      {isOver && active?.id !== tab.id ? (
        <TabGrid sx={{ minHeight: 55.4 }} />
      ) : null}
      {!isDragging && (
        <TabGrid>
          <div ref={setNodeRefDraggable} {...listeners} {...attributes}>
            <div ref={setNodeRefDroppable} style={styleDropable}>
              <TabDisplay tab={tab} {...props} />
            </div>
          </div>
        </TabGrid>
      )}
    </>
  );
};

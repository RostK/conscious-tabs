import { TabDisplay } from "./TabDisplay.tsx";
import { useDraggable } from "@dnd-kit/core";
import { TabGrid } from "../elements/TabGrid.tsx";
import { ComponentProps, FC } from "react";

import { GroupItem } from "../types.ts";
import { DropPlaceholder } from "../DnD";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { handleDrop } from "./handleDrop.ts";

export const TabListItem: FC<
  ComponentProps<typeof TabDisplay> & { group?: GroupItem }
> = ({ tab, group, ...props }) => {
  const { isOver, isSelf, Dropzone } = useDropzone({
    id: tab.id as number,
    type: "tab",
    data: tab,
    onDrop: handleDrop,
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

  return (
    <>
      {isOver && !isSelf ? <DropPlaceholder /> : null}
      {!isDragging && (
        <TabGrid
          sx={[
            group
              ? {
                  backgroundColor: `color-mix(in srgb, ${group.color} 15%, transparent)`,
                }
              : {},
          ]}
        >
          <div ref={setNodeRefDraggable} {...listeners} {...attributes}>
            <Dropzone
              sx={[
                Boolean(group) && {
                  backgroundColor: `color-mix(in srgb, ${group?.color as string} 15%, transparent)`,
                },
              ]}
            >
              <TabDisplay tab={tab} {...props} />
            </Dropzone>
          </div>
        </TabGrid>
      )}
    </>
  );
};

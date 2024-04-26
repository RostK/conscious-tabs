import { useDraggable } from "@dnd-kit/core";
import { ComponentProps, FC } from "react";

import { DropPlaceholder } from "../DnD";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { TabGrid } from "../elements/TabGrid.tsx";
import { GroupItem } from "../types.ts";
import { handleDrop } from "./handleDrop.ts";
import { TabDisplay } from "./TabDisplay.tsx";

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
    over,
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
      {isOver && !isSelf ? (
        <DropPlaceholder
          sx={[
            Boolean(group) && {
              backgroundColor: `color-mix(in srgb, ${group?.color as string} 15%, transparent)`,
            },
          ]}
        />
      ) : null}
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
            <Dropzone>
              <TabDisplay tab={tab} {...props} />
            </Dropzone>
          </div>
        </TabGrid>
      )}
    </>
  );
};

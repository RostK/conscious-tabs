import { useDraggable } from "@dnd-kit/core";
import {
  ComponentProps,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

import { DropPlaceholder } from "../DnD";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { DragHandle } from "../elements/DragHandle.tsx";
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
    isDragging,
    attributes,
    listeners,
    setNodeRef: setNodeRefDraggable,
    setActivatorNodeRef,
  } = useDraggable({
    id: tab.id as number,
    data: tab,
  });

  // dnd-kit types every listener as a bare `Function`, so the two halves are
  // narrowed once here rather than cast at each use.
  const onMouseDown = listeners?.onMouseDown as
    | MouseEventHandler<HTMLDivElement>
    | undefined;
  const onKeyDown = listeners?.onKeyDown as KeyboardEventHandler | undefined;

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
                  // Faint tint + a solid group-colour left edge, matching the
                  // group header — reads as a quiet container, not a colour block.
                  backgroundColor: `color-mix(in srgb, ${group.color} 8%, transparent)`,
                  boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
                }
              : {},
          ]}
        >
          {/* Only the mouse listener goes here, so the whole row stays
              draggable by pointer. The keyboard half — and dnd-kit's
              tabIndex/role/aria — lives on the handle instead; see
              DragHandle for why the two had to be separated. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div ref={setNodeRefDraggable} onMouseDown={onMouseDown}>
            <Dropzone>
              <TabDisplay
                tab={tab}
                dragHandle={
                  <DragHandle
                    label={`Reorder ${tab.title || "tab"}`}
                    setActivatorNodeRef={setActivatorNodeRef}
                    attributes={attributes}
                    onKeyDown={onKeyDown}
                  />
                }
                {...props}
              />
            </Dropzone>
          </div>
        </TabGrid>
      )}
    </>
  );
};

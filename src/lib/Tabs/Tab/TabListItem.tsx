import { useDraggable } from "@dnd-kit/core";
import {
  ComponentProps,
  FC,
  KeyboardEventHandler,
  memo,
  MouseEventHandler,
} from "react";

import { DropPlaceholder } from "../DnD";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { DragHandle } from "../elements/DragHandle.tsx";
import { TabGrid } from "../elements/TabGrid.tsx";
import { GroupItem } from "../types.ts";
import { handleDrop } from "./handleDrop.ts";
import { TabDisplay } from "./TabDisplay.tsx";

const TabListItemRow: FC<
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
                    // Last control in the row, flush with its right edge.
                    edge="end"
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

/**
 * A row re-renders when its own tab changes, not when any tab does.
 *
 * `useTabsStructure` hands back the same `TabItem` object while a tab's
 * contents are unchanged, so reference equality is a real answer here rather
 * than a coincidence — without that this memo would never hit and would only
 * add a comparison to every render.
 *
 * `group` is compared by the one field this component reads. It is rebuilt on
 * every pass, with a `tabs` array that differs between the full list and
 * `SelectionToolbar`'s filtered view, so comparing it by reference would fail
 * for every grouped row — and comparing it deeply would be work in service of
 * a colour.
 *
 * Note what this does *not* buy: `useDraggable` and `useDropzone` subscribe to
 * dnd-kit's context, so every row still re-renders while a drag is live. That
 * is dnd-kit's design and a separate problem from this one.
 */
export const TabListItem = memo(TabListItemRow, (before, after) => {
  const { tab: beforeTab, group: beforeGroup, ...beforeRest } = before;
  const { tab: afterTab, group: afterGroup, ...afterRest } = after;
  if (beforeTab !== afterTab) return false;
  if (beforeGroup?.color !== afterGroup?.color) return false;
  const keys = Object.keys(beforeRest) as (keyof typeof beforeRest)[];
  if (keys.length !== Object.keys(afterRest).length) return false;
  return keys.every((key) => beforeRest[key] === afterRest[key]);
});

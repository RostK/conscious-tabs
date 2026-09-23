import { DraggableAttributes } from "@dnd-kit/core";
import { DragIndicator } from "@mui/icons-material";
import {
  ComponentProps,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

import { ItemButton } from "./ItemButton.tsx";

/**
 * The keyboard's way into a drag.
 *
 * dnd-kit's `attributes` carry `role="button"` and `tabIndex={0}`, so spreading
 * them onto a wrapper around a row — which is what this codebase did — made
 * every row two tab stops, the first of them an unlabelled element announcing
 * itself only as "draggable". In a list of twenty tabs that is forty stops and
 * twenty meaningless announcements.
 *
 * The obvious repair, moving the drag onto the row's own button, breaks Enter:
 * dnd-kit's KeyboardSensor activates on Space *and* Enter, so Enter would start
 * a drag instead of switching to the tab. Presumably why the wrapper existed.
 *
 * So the listeners are split by input. The row keeps `onMouseDown`, so dragging
 * with a mouse still works from anywhere on it. This handle takes `onKeyDown`
 * and the ARIA attributes, so a keyboard drag starts from one clearly-named
 * control — and, for the first time, a discoverable one.
 */
export const DragHandle: FC<{
  label: string;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  onKeyDown?: KeyboardEventHandler;
  /**
   * Defaults to the class the rows use to reveal controls on hover or focus.
   * Pass undefined where the handle should always be visible — the
   * current-tab card has no such rule, so the default would hide it forever.
   */
  className?: string;
  sx?: ComponentProps<typeof ItemButton>["sx"];
}> = ({
  label,
  setActivatorNodeRef,
  attributes,
  onKeyDown,
  className = "itemAction",
  sx,
}) => {
  // The handle sits inside the row's own button, so a click on it would
  // otherwise bubble and switch tabs — grabbing is not activating.
  const swallowClick: MouseEventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <ItemButton
      className={className}
      // Reached with Left/Right from the row, not by Tab — see TabDisplay.
      data-row-control
      ref={setActivatorNodeRef}
      aria-label={label}
      onKeyDown={onKeyDown}
      onClick={swallowClick}
      sx={[{ cursor: "grab" }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...attributes}
      tabIndex={-1}
    >
      <DragIndicator fontSize="small" />
    </ItemButton>
  );
};

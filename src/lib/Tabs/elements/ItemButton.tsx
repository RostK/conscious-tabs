import { IconButton } from "@mui/material";
import { ComponentProps, forwardRef } from "react";

/**
 * Forwards its ref so dnd-kit can be told which element is the drag activator
 * (`setActivatorNodeRef`) — without that, focus is not restored to the handle
 * after a keyboard drag ends.
 */
export const ItemButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof IconButton>
>(({ sx, ...props }, ref) => {
  return (
    <IconButton
      ref={ref}
      sx={[
        // No solid fill. It was there to mask the title running underneath an
        // absolutely-positioned action, but it only matched a row at rest —
        // on a hovered or selected row the buttons read as white patches
        // stamped over it. The rows reserve space for their actions now, so
        // there is nothing to mask.
        (theme) => ({
          "&:hover": {
            backgroundColor: `color-mix(in srgb, ${theme.palette.background.paper} 80%, ${theme.palette.text.primary})`,
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
});

ItemButton.displayName = "ItemButton";

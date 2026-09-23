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
        { backgroundColor: "background.paper" },
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

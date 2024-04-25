import { IconButton } from "@mui/material";
import { ComponentProps, FC } from "react";

export const ItemButton: FC<ComponentProps<typeof IconButton>> = ({
  sx,
  ...props
}) => {
  return (
    <IconButton
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
};

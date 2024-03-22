import { ComponentProps, FC, PropsWithChildren } from "react";
import Grid from "@mui/material/Unstable_Grid2";
import { ListItemButton } from "@mui/material";

export const TabGrid: FC<
  PropsWithChildren<{ sx?: ComponentProps<typeof ListItemButton>["sx"] }>
> = ({ children, sx }) => {
  return (
    <Grid
      xs={12}
      sm={6}
      md={4}
      sx={[{ width: "100%" }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Grid>
  );
};

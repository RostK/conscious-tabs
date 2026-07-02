import { ListItemButton } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { ComponentProps, FC, PropsWithChildren } from "react";

/**
 * Row container for every tab and group header. Kept flat (no per-row card
 * border) — in a dense list, carding each row reads as noise. Callers may pass
 * an `sx` to tint the row (e.g. by Chrome tab-group colour).
 */
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

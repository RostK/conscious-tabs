import { ListItemButton } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { ComponentProps, FC, PropsWithChildren } from "react";

/**
 * Row container for every tab and group header. Kept flat (no per-row card
 * border) — in a dense list, carding each row reads as noise. Callers may pass
 * an `sx` to tint the row (e.g. by Chrome tab-group colour).
 *
 * It is the row's `listitem` in `RowList`, unless it is `decorative`.
 *
 * `decorative` is for a cell that takes a row's place in the grid and is not a
 * row: a drop placeholder, and the empty zone at the end of a window. Those are
 * out of the accessibility tree. SPEC-04 AC-31 allows what a drag inserts to be
 * a `listitem` or to be out of the tree, and they were items at first — empty
 * ones with no name, so a blank entry to anyone reading the list during a drag,
 * in a list whose size changed with every arrow press (found in review). No
 * role as well as `aria-hidden`: nothing in such a cell can take focus, so
 * hiding it is safe, and a cell that lost the attribute would then fail
 * `aria-required-children` rather than pass as an item again.
 */
export const TabGrid: FC<
  PropsWithChildren<{
    sx?: ComponentProps<typeof ListItemButton>["sx"];
    decorative?: boolean;
  }>
> = ({ children, sx, decorative }) => {
  return (
    <Grid
      role={decorative ? undefined : "listitem"}
      aria-hidden={decorative ? true : undefined}
      xs={12}
      sm={6}
      md={4}
      sx={[{ width: "100%" }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Grid>
  );
};

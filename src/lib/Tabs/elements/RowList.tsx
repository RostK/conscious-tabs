import { Box } from "@mui/material";
import { FC, PropsWithChildren } from "react";

/**
 * The one `list` on the surface, shared by `TabsView` and `SearchView`.
 *
 * Rows are its `listitem`s: `TabGrid` carries the role for tab, group and
 * placeholder rows, and `WindowListItem` puts it around the window header.
 *
 * Do not put any `aria-*` attribute on a wrapper between this and the items
 * (the `Grid` container, the `Grid` items, the `Dropzone` div). axe treats an
 * element with no role, no aria and no focusability as transparent, which is
 * what lets those wrappers sit here. One global aria attribute on any of them
 * turns it into an unallowed owned child of the list and fires
 * `aria-required-children` — invisible until axe runs.
 *
 * Render it only when there are rows: an empty container must not announce
 * itself as a list of zero, so callers mount it below their empty-state
 * early return.
 */
export const RowList: FC<PropsWithChildren> = ({ children }) => (
  <Box role="list" aria-label="Open tabs">
    {children}
  </Box>
);

import { ComponentProps, FC } from "react";

import { TabGrid } from "../elements/TabGrid.tsx";

/**
 * Where a drop would land, for someone looking. Not a row, so not an item:
 * see `decorative` on `TabGrid`. What says it aloud is the drag's own
 * announcement (`announcements.ts`).
 */
export const DropPlaceholder: FC<{
  sx?: ComponentProps<typeof TabGrid>["sx"];
}> = ({ sx }) => {
  return (
    <TabGrid
      decorative
      sx={[
        {
          minHeight: 49.5,
          border: "2px dashed lightgray",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

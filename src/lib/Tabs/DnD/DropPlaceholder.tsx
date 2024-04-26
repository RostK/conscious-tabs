import { ComponentProps, FC } from "react";

import { TabGrid } from "../elements/TabGrid.tsx";

export const DropPlaceholder: FC<{
  sx?: ComponentProps<typeof TabGrid>["sx"];
}> = ({ sx }) => {
  return (
    <TabGrid
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

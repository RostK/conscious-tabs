import { TabGrid } from "./elements/TabGrid.tsx";
import { ComponentProps, FC } from "react";

export const DropPlaceholder: FC<{
  sx?: ComponentProps<typeof TabGrid>["sx"];
}> = ({ sx }) => {
  return (
    <TabGrid
      sx={[
        {
          minHeight: 55.4,
          border: "2px dashed lightgray",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

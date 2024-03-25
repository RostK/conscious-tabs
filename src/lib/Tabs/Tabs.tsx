import { FC } from "react";
import { GroupItem, TabsStructure } from "./types.ts";
import { TabListItem } from "./listItems/TabListItem.tsx";
import { GroupListItem } from "./listItems/GroupListItem.tsx";
import Grid from "@mui/material/Unstable_Grid2";
import { TabGrid } from "./elements/TabGrid.tsx";
import { useDroppable } from "@dnd-kit/core";
import { DropPlaceholder } from "./DropPlaceholder.tsx";

export const Tabs: FC<{
  expandedGroups?: boolean;
  focus?: boolean;
  tabsStructure: TabsStructure;
  window?: chrome.windows.Window;
}> = ({ tabsStructure, window, focus, expandedGroups }) => {
  const {
    isOver,
    active,
    setNodeRef: setNodeRefDroppable,
  } = useDroppable({
    id: window?.id ?? 0,
    data: window,
  });

  const styleDropable = {
    pointerEvents: active?.id ? ("none" as const) : undefined,
    minHeight: "2rem",
  };
  return (
    <Grid
      spacing={0}
      sx={{ width: "100%", bgcolor: "background.paper" }}
      container
    >
      {tabsStructure.map((item) =>
        item.type === "tab" ? (
          <TabListItem focus={focus} tab={item} key={item.id} />
        ) : (
          <GroupListItem
            expanded={expandedGroups}
            group={item as GroupItem}
            key={item.id}
          />
        ),
      )}
      {isOver && <DropPlaceholder />}
      {active?.id && (
        <TabGrid>
          <div ref={setNodeRefDroppable} style={styleDropable} />
        </TabGrid>
      )}
    </Grid>
  );
};

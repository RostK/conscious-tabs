import { FC } from "react";
import { GroupItem, TabsStructure } from "./types.ts";
import { TabListItem } from "./TabListItem.tsx";
import { GroupListItem } from "./GroupListItem.tsx";
import Grid from "@mui/material/Unstable_Grid2";

export const Tabs: FC<{
  expandedGroups?: boolean;
  focus?: boolean;
  tabsStructure: TabsStructure;
}> = ({ tabsStructure, focus, expandedGroups }) => {
  return (
    <Grid
      spacing={0}
      sx={{ width: "100%", bgcolor: "background.paper" }}
      container
    >
      {tabsStructure.map((item) =>
        item.type === "tab" ? (
          <Grid xs={12} sm={6} md={4} sx={{ width: "100%" }} key={item.id}>
            <TabListItem focus={focus} tab={item} />
          </Grid>
        ) : (
          <GroupListItem
            expanded={expandedGroups}
            group={item as GroupItem}
            key={item.id}
          />
        ),
      )}
    </Grid>
  );
};

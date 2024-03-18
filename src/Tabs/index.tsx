import { List } from "@mui/material";
import { FC } from "react";
import { GroupItem, TabsStructure } from "./types.ts";
import { TabListItem } from "./TabListItem.tsx";
import { GroupListItem } from "./GroupListItem.tsx";

export const Tabs: FC<{ tabsStructure: TabsStructure }> = ({
  tabsStructure,
}) => {
  return (
    <List dense sx={{ width: "100%", bgcolor: "background.paper" }}>
      {tabsStructure.map((item) => {
        if (item.type === "tab") {
          return <TabListItem tab={item} key={item.id} />;
        } else {
          return <GroupListItem group={item as GroupItem} key={item.id} />;
        }
      })}
    </List>
  );
};

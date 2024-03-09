import { List } from "@mui/material";
import { FC } from "react";
import { TabItem } from "./TabItem.tsx";
import { GroupItem } from "./GroupItem.tsx";

export const Tabs: FC<{ tabsStructure: TabsStructure }> = ({
  tabsStructure,
}) => {
  return (
    <List dense sx={{ width: "100%", bgcolor: "background.paper" }}>
      {tabsStructure.map((item) => {
        if (item.type === "tab") {
          return <TabItem tab={item} key={item.id} />;
        } else {
          return <GroupItem group={item} key={item.id} />;
        }
      })}
    </List>
  );
};

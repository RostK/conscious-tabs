import { FC } from "react";
import { GroupItem, TabsStructure } from "./types.ts";
import { TabListItem } from "./Tab/TabListItem.tsx";
import { GroupListItem } from "./TabsGroup/GroupListItem.tsx";
import Grid from "@mui/material/Unstable_Grid2";
import { WindowDropzone } from "./Window/WindowDropzone.tsx";

export const Tabs: FC<{
  expandedGroups?: boolean;
  focus?: boolean;
  tabsStructure: TabsStructure;
  window?: chrome.windows.Window;
}> = ({ tabsStructure, window, focus, expandedGroups }) => {
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
      {window && <WindowDropzone window={window} />}
    </Grid>
  );
};
